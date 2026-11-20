import OfferClick from "../models/offerClickModel.js";

/**
 * Tracks unique daily offer clicks. Increments count only if the user is new for today.
 * @param {String|ObjectId} offerId 
 * @param {String|ObjectId} merchantId 
 * @param {String|ObjectId} userId 
 */
export const trackUniqueOfferClick = async (
  offerId,
  merchantId,
  userId,
  offerModel = "Offer"
) => {
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);

  // Atomically add the user only if they haven't clicked this offer/combo today,
  // and increment totalClicks only when a new user is added.
  const existingRecord = await OfferClick.findOne({
    merchantId,
    offerId,
    offerModel,
    date: todayUTC,
    "clickedUsers.userId": userId,
  }).lean();

  if (!existingRecord) {
    await OfferClick.findOneAndUpdate(
      { merchantId, offerId, offerModel, date: todayUTC },
      {
        $inc: { totalClicks: 1 },
        $push: { clickedUsers: { userId, clickedAt: new Date() } },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }
};
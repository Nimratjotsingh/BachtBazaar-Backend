import OfferClick from "../models/offerClickModel.js";

/**
 * Tracks unique daily offer clicks. Increments count only if the user is new for today.
 * @param {String|ObjectId} offerId 
 * @param {String|ObjectId} merchantId 
 * @param {String|ObjectId} userId 
 */
export const trackUniqueOfferClick = async (offerId, merchantId, userId) => {
  try {
    if (!offerId || !merchantId || !userId) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const baseFilter = { merchantId, offerId, date: today };

    // Step 1: Ensure daily document exists for today
    await OfferClick.updateOne(
      baseFilter,
      { $setOnInsert: { date: today, merchantId, offerId, totalClicks: 0 } },
      { upsert: true }
    );

    // Step 2: Push user and increment count ONLY if userId is not already present in clickedUsers
    await OfferClick.updateOne(
      { ...baseFilter, "clickedUsers.userId": { $ne: userId } },
      {
        $push: { clickedUsers: { userId, clickedAt: new Date() } },
        $inc: { totalClicks: 1 },
      }
    );
  } catch (error) {
    console.error("Failed to track unique offer click:", error.message);
  }
};
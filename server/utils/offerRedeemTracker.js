import OfferRedeem from "../models/offerRedeemModel.js";

/**
 * Tracks successful daily offer redemptions.
 * @param {String|ObjectId} offerId 
 * @param {String|ObjectId} merchantId 
 * @param {String|ObjectId} userId 
 * @param {String} redemptionCode 
 * @param {String|ObjectId} [shopId=null] 
 */
export const trackOfferRedemption = async (offerId, merchantId, userId,  shopId = null) => {
  try {
    if (!offerId || !merchantId || !userId ) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const baseFilter = { merchantId, offerId, date: today };

    // Step 1: Ensure daily document exists for today
    await OfferRedeem.updateOne(
      baseFilter,
      { $setOnInsert: { date: today, merchantId, offerId, shopId, totalRedeems: 0 } },
      { upsert: true }
    );

    // Step 2: Push redemption record and increment total redemptions
    await OfferRedeem.updateOne(
      baseFilter,
      {
        $push: { 
          redeemedUsers: { userId, redeemedAt: new Date() } 
        },
        $inc: { totalRedeems: 1 },
      }
    );
  } catch (error) {
    console.error("Failed to track offer redemption:", error.message);
  }
};
import ShopClick from "../models/shopClickModel.js";

/**
 * Tracks unique daily shop clicks. Increments count only if the user is new for today.
 * @param {String|ObjectId} shopId 
 * @param {String|ObjectId} merchantId 
 * @param {String|ObjectId} userId 
 */
export const trackUniqueShopClick = async (shopId, merchantId, userId) => {
  try {
    if (!shopId || !merchantId || !userId) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const baseFilter = { merchantId, shopId, date: today };

    // Step 1: Ensure daily document exists for today
    await ShopClick.updateOne(
      baseFilter,
      { $setOnInsert: { date: today, merchantId, shopId, totalClicks: 0 } },
      { upsert: true }
    );

    // Step 2: Push user and increment count ONLY if userId is not already present in clickedUsers
    await ShopClick.updateOne(
      { ...baseFilter, "clickedUsers.userId": { $ne: userId } },
      {
        $push: { clickedUsers: { userId, clickedAt: new Date() } },
        $inc: { totalClicks: 1 },
      }
    );
  } catch (error) {
    console.error("Failed to track unique shop click:", error.message);
  }
};
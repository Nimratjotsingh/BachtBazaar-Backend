import admin from "../config/firebase.js";
import User from "../models/userModel.js";

/**
 * Sends system panel push notifications to users who wishlisted a product when its price drops.
 * @param {Object} params
 * @param {String|ObjectId} params.productId
 * @param {String} params.productTitle
 * @param {Number} params.oldPrice
 * @param {Number} params.newPrice
 * @param {Array} params.wishlistedUserIds
 */
export const sendPriceDropPushNotification = async ({
  productId,
  productTitle,
  oldPrice,
  newPrice,
  wishlistedUserIds,
}) => {
  try {
    if (!wishlistedUserIds || wishlistedUserIds.length === 0) return;

    // 1. Fetch FCM tokens for all users who have this product in their wishlist
    const users = await User.find({
      _id: { $in: wishlistedUserIds },
      fcmTokens: { $exists: true, $not: { $size: 0 } },
    })
      .select("fcmTokens")
      .lean();

    // Collect all active device tokens
    const allTokens = users.flatMap((user) => user.fcmTokens).filter(Boolean);

    if (allTokens.length === 0) {
      console.log("[Push Notification] No active device tokens found for wishlisted users.");
      return;
    }

    const discountAmount = oldPrice - newPrice;
    const discountPercentage = Math.round((discountAmount / oldPrice) * 100);

    // 2. Build Push Notification Payload for System Tray
    const messagePayload = {
      notification: {
        title: "🔥 Price Drop Alert!",
        body: `"${productTitle}" is now ₹${newPrice} (Was ₹${oldPrice}) - ${discountPercentage}% OFF! Tap to view.`,
      },
      data: {
        type: "PRICE_DROP",
        productId: productId.toString(),
        click_action: "FLUTTER_NOTIFICATION_CLICK", // Or app route identifier
      },
      tokens: allTokens,
    };

    // 3. Send Multicast Push Notification via Firebase
    const response = await admin.messaging().sendEachForMulticast(messagePayload);

    console.log(
      `[Push Notification Sent] ${response.successCount} delivered, ${response.failureCount} failed.`
    );
  } catch (error) {
    console.error("Failed to send system push notification:", error.message);
  }
};
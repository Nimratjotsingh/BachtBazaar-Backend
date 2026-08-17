import admin from "../config/firebase.js";
import User from "../models/userModel.js";
import Notification from "../models/Notification.js";

/**
 * Dispatches a push notification and records an in-app notification
 * when a merchant submits a bid on a customer's request.
 * @param {Object} params
 * @param {String|ObjectId} params.userId
 * @param {String} params.requestTitle
 * @param {Number} params.offerPrice
 * @param {String} params.shopName
 * @param {String|ObjectId} params.requestId
 * @param {String|ObjectId} params.bidId
 */
export const notifyUserForNewBid = async ({
  userId,
  requestTitle,
  offerPrice,
  shopName,
  requestId,
  bidId,
}) => {
  try {
    if (!userId) return;

    const title = "🏷️ New Offer Received!";
    const body = `${shopName} offered ₹${offerPrice} for your request "${requestTitle}". Tap to view details!`;
    const notificationData = {
      requestId: requestId.toString(),
      bidId: bidId.toString(),
      offerPrice: offerPrice.toString(),
      shopName: shopName || "",
    };

    // 1. Persist In-App Notification Record in MongoDB
    await Notification.create({
      recipientId: userId,
      recipientType: "User",
      title,
      body,
      type: "BEST_PRICE_NEW_BID",
      data: notificationData,
      isRead: false,
    });

    // 2. Fetch user's active device FCM tokens
    const user = await User.findById(userId).select("fcmTokens name").lean();

    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      console.log(`[Bid Alert] In-app record created, but no active FCM tokens found for user: ${userId}`);
      return;
    }

    const cleanTokens = user.fcmTokens.filter(Boolean);
    if (cleanTokens.length === 0) return;

    // 3. Build system notification payload
    const messagePayload = {
      notification: {
        title,
        body,
      },
      data: {
        type: "BEST_PRICE_NEW_BID",
        ...notificationData,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      tokens: cleanTokens,
    };

    // 4. Dispatch multicast push notification via Firebase
    const response = await admin.messaging().sendEachForMulticast(messagePayload);
    console.log(
      `[Bid Alert] Dispatched to user ${userId} (${response.successCount} delivered, ${response.failureCount} failed).`
    );
  } catch (error) {
    console.error("Failed to send bid push notification to user:", error.message);
  }
};
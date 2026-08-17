import admin from "../config/firebase.js";
import Merchant from "../models/merchantModel.js";
import Notification from "../models/Notification.js";

/**
 * Dispatches push notifications and creates in-app notification records
 * for nearby merchants matching the category.
 */
export const notifyNearbyMerchantsForPriceRequest = async ({
  merchantIds,
  requestTitle,
  budget,
  requestId,
  categoryName,
}) => {
  try {
    if (!merchantIds || merchantIds.length === 0) return;

    // 1. Fetch valid, unblocked merchants
    const merchants = await Merchant.find({
      _id: { $in: merchantIds },
      isBlocked: { $ne: true },
      status: { $ne: "banned" },
    })
      .select("_id fcmTokens name store_name")
      .lean();

    if (merchants.length === 0) return;

    const title = "🎯 New Customer Deal Request Nearby!";
    const body = `A customer nearby is looking for "${requestTitle}" (Budget: ₹${budget}). Tap to make an offer!`;
    const notificationData = {
      requestId: requestId.toString(),
      budget: budget.toString(),
      category: categoryName || "",
    };

    // 2. Persist In-App Notifications in Database for all matching merchants
    const inAppNotifications = merchants.map((merchant) => ({
      recipientId: merchant._id,
      recipientType: "Merchant",
      title,
      body,
      type: "BEST_PRICE_REQUEST",
      data: notificationData,
      isRead: false,
    }));

    await Notification.insertMany(inAppNotifications);

    // 3. Collect active device tokens for Push Notification
    const allTokens = merchants
      .flatMap((m) => m.fcmTokens || [])
      .filter(Boolean);

    if (allTokens.length === 0) {
      console.log("[Best Price Alert] In-app records created, but no active FCM tokens found.");
      return;
    }

    // 4. Construct Multicast Payload for Device Notification Tray
    const messagePayload = {
      notification: {
        title,
        body,
      },
      data: {
        type: "BEST_PRICE_REQUEST",
        ...notificationData,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      tokens: allTokens,
    };

    // 5. Dispatch to System Tray via Firebase
    const response = await admin.messaging().sendEachForMulticast(messagePayload);
    console.log(
      `[Best Price Alert] Dispatched to ${response.successCount} device(s), ${response.failureCount} failed.`
    );
  } catch (error) {
    console.error("Failed to notify nearby merchants of best price request:", error.message);
  }
};
import admin from "../config/firebase.js";
import User from "../models/userModel.js";
import Merchant from "../models/merchantModel.js";
import Notification from "../models/Notification.js";

/**
 * Dispatches Push and In-App notification for Delivery lifecycle transitions.
 */
export const sendDeliveryNotification = async ({
  recipientType, // "User" | "Merchant"
  recipientId,
  title,
  body,
  type,
  orderId,
  extraData = {},
}) => {
  try {
    if (!recipientId || !recipientType) return;

    const payloadData = {
      type,
      orderId: orderId.toString(),
      ...extraData,
    };

    // 1. Create In-App Notification in DB
    await Notification.create({
      recipientId,
      recipientType,
      title,
      body,
      type,
      data: payloadData,
      isRead: false,
    });

    // 2. Fetch active FCM token
    let fcmToken = null;
    if (recipientType === "User") {
      const user = await User.findById(recipientId).select("fcmToken").lean();
      fcmToken = user?.fcmToken;
    } else if (recipientType === "Merchant") {
      const merchant = await Merchant.findById(recipientId)
        .select("fcmToken fcmTokens")
        .lean();
      fcmToken = merchant?.fcmToken || (merchant?.fcmTokens && merchant.fcmTokens[0]);
    }

    if (!fcmToken || typeof fcmToken !== "string" || !fcmToken.trim()) {
      console.log(`[Delivery Notification] DB saved, no FCM token for ${recipientType}: ${recipientId}`);
      return;
    }

    // 3. Dispatch FCM Push
    const messagePayload = {
      notification: { title, body },
      data: {
        ...Object.keys(payloadData).reduce((acc, key) => {
          acc[key] = String(payloadData[key]);
          return acc;
        }, {}),
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      token: fcmToken.trim(),
    };

    await admin.messaging().send(messagePayload);
  } catch (error) {
    console.error(`[Delivery Notification Error - ${type}]:`, error.message);
  }
};
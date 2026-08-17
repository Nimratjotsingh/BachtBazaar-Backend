import admin from "../config/firebase.js";
import Notification from "../models/Notification.js";

/**
 * Sends a Birthday System Panel Push Notification via Firebase FCM
 * and creates an In-App Notification record in MongoDB.
 * @param {String|ObjectId} recipientId - ID of the User or Merchant
 * @param {Array<String>} fcmTokens - Array of active device FCM tokens
 * @param {String} recipientName - Name of the User or Merchant
 * @param {String} role - "USER" | "MERCHANT"
 * @param {Object} [extraData] - Additional payload metadata
 */
export const sendBirthdayPushNotification = async (
  recipientId,
  fcmTokens = [],
  recipientName,
  role = "USER",
  extraData = {}
) => {
  try {
    const isMerchant = role.toUpperCase() === "MERCHANT";
    const recipientType = isMerchant ? "Merchant" : "User";

    // Dynamic Title & Body Templates
    const notificationTitle = isMerchant
      ? `🎉 Happy Birthday, ${recipientName}! 🎂`
      : `🎂 Happy Birthday, ${recipientName}! Special Gift Inside 🎁`;

    const notificationBody = isMerchant
      ? `BachatBazarr wishes you a prosperous year ahead! Thank you for being a great partner. Check your account for your birthday bonus.`
      : `Wishing you a fantastic day! Open your app to explore exclusive birthday deals and reward coins reserved just for you.`;

    const notificationData = {
      role: role.toUpperCase(),
      ...extraData,
    };

    // 1. Create In-App Notification Record in MongoDB
    if (recipientId) {
      await Notification.create({
        recipientId,
        recipientType,
        title: notificationTitle,
        body: notificationBody,
        type: "BIRTHDAY_WISH",
        data: notificationData,
        isRead: false,
      });
    }

    // 2. Filter & Validate FCM Tokens
    const validTokens = Array.isArray(fcmTokens) ? fcmTokens.filter(Boolean) : [];
    if (validTokens.length === 0) {
      console.log(
        `[Birthday Notification] In-app record saved, but no active FCM tokens found for ${recipientName} (${role}).`
      );
      return;
    }

    // 3. Construct FCM Payload for System Tray
    const messagePayload = {
      notification: {
        title: notificationTitle,
        body: notificationBody,
      },
      data: {
        type: "BIRTHDAY_WISH",
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        ...Object.keys(notificationData).reduce((acc, key) => {
          acc[key] = String(notificationData[key]);
          return acc;
        }, {}),
      },
      tokens: validTokens,
    };

    // 4. Send Multicast via Firebase
    const response = await admin.messaging().sendEachForMulticast(messagePayload);
    console.log(
      `[Birthday Push Notification] Sent to ${recipientName} (${role}): ${response.successCount} delivered, ${response.failureCount} failed.`
    );
  } catch (error) {
    console.error(`Failed to send birthday notification to ${recipientName}:`, error.message);
  }
};
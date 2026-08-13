import admin from "../config/firebase.js"; // Your initialized Firebase Admin SDK

/**
 * Sends a Birthday System Panel Push Notification via Firebase FCM
 * @param {Array<String>} fcmTokens - Array of active device FCM tokens
 * @param {String} recipientName - Name of the User or Merchant
 * @param {String} role - "USER" | "MERCHANT"
 * @param {Object} [extraData] - Additional payload metadata
 */
export const sendBirthdayPushNotification = async (fcmTokens, recipientName, role = "USER", extraData = {}) => {
  try {
    if (!fcmTokens || fcmTokens.length === 0) return;

    const isMerchant = role === "MERCHANT";

    // Dynamic Title & Body Templates
    const notificationTitle = isMerchant
      ? `🎉 Happy Birthday, ${recipientName}! 🎂`
      : `🎂 Happy Birthday, ${recipientName}! Special Gift Inside 🎁`;

    const notificationBody = isMerchant
      ? `BachatBazarr wishes you a prosperous year ahead! Thank you for being a great partner. Check your account for your birthday bonus.`
      : `Wishing you a fantastic day! Open your app to explore exclusive birthday deals and reward coins reserved just for you.`;

    const messagePayload = {
      notification: {
        title: notificationTitle,
        body: notificationBody,
      },
      data: {
        type: "BIRTHDAY_WISH",
        role,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        ...extraData,
      },
      tokens: fcmTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(messagePayload);
    console.log(
      `[Birthday Push Notification] Sent to ${recipientName} (${role}): ${response.successCount} delivered, ${response.failureCount} failed.`
    );
  } catch (error) {
    console.error(`Failed to send birthday notification to ${recipientName}:`, error.message);
  }
};
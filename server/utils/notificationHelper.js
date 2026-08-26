import admin from "../config/firebase.js";
import Notification from "../models/Notification.js";

/**
 * Sends a multicast push notification and creates in-app database records.
 *
 * @param {Object} params
 * @param {Array<string>} params.tokens - Array of device FCM tokens
 * @param {Object} params.payload - Notification payload
 * @param {string} params.payload.title - Notification Title
 * @param {string} params.payload.body - Notification Body Message
 * @param {string} [params.payload.type="GENERAL"] - Notification Type Enum
 * @param {Object} [params.payload.data={}] - Custom key-value data object
 * @param {Array<string|ObjectId>} [params.recipients=[]] - Array of recipient User or Merchant ObjectIds
 * @param {string} [params.recipientType="User"] - "User" | "Merchant"
 *
 * @returns {Promise<{successCount: number, failureCount: number, savedInAppCount: number, error?: string}>}
 */
export const sendMulticastNotificationWithPersistence = async ({
  tokens = [],
  payload = {},
  recipients = [],
  recipientType = "User",
}) => {
  try {
    const { title, body, type = "GENERAL", data = {} } = payload;

    if (!title || !body) {
      return {
        successCount: 0,
        failureCount: 0,
        savedInAppCount: 0,
        error: "Title and body are required parameters.",
      };
    }

    // 1. Format custom data payload (FCM values must strictly be strings)
    const formattedData = {};
    if (data && typeof data === "object") {
      Object.keys(data).forEach((key) => {
        formattedData[key] = String(data[key]);
      });
    }

    // 2. Persist In-App Notification Records in MongoDB (in chunks of 1000)
    let savedInAppCount = 0;
    const cleanRecipients = (Array.isArray(recipients) ? recipients : [recipients])
      .filter(Boolean);

    if (cleanRecipients.length > 0) {
      const DB_BATCH_SIZE = 1000;
      for (let i = 0; i < cleanRecipients.length; i += DB_BATCH_SIZE) {
        const batchRecipients = cleanRecipients.slice(i, i + DB_BATCH_SIZE);
        const inAppDocs = batchRecipients.map((recipientId) => ({
          recipientId,
          recipientType: recipientType === "Merchant" ? "Merchant" : "User",
          title,
          body,
          type,
          data: {
            ...data,
            type,
          },
          isRead: false,
        }));

        const insertResult = await Notification.insertMany(inAppDocs, { ordered: false });
        savedInAppCount += insertResult.length;
      }
    }

    // 3. Filter and sanitize FCM tokens
    const cleanTokens = (Array.isArray(tokens) ? tokens : [tokens]).filter(
      (token) => typeof token === "string" && token.trim().length > 0
    );

    if (cleanTokens.length === 0) {
      return {
        successCount: 0,
        failureCount: 0,
        savedInAppCount,
      };
    }

    // 4. Batch tokens in chunks of 500 (Firebase Admin multicast limit)
    const FCM_BATCH_SIZE = 500;
    let totalSuccessCount = 0;
    let totalFailureCount = 0;

    for (let i = 0; i < cleanTokens.length; i += FCM_BATCH_SIZE) {
      const batchTokens = cleanTokens.slice(i, i + FCM_BATCH_SIZE);

      const message = {
        notification: {
          title,
          body,
        },
        data: {
          type,
          ...formattedData,
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
        tokens: batchTokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      totalSuccessCount += response.successCount;
      totalFailureCount += response.failureCount;
    }

    return {
      successCount: totalSuccessCount,
      failureCount: totalFailureCount,
      savedInAppCount,
    };
  } catch (error) {
    console.error("Multicast Notification & Persistence Error:", error);
    return {
      successCount: 0,
      failureCount: tokens ? tokens.length : 0,
      savedInAppCount: 0,
      error: error.message,
    };
  }
};
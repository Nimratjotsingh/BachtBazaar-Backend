import admin from "../config/firebase.js";

/**
 * Utility helper to send push notifications to a list of FCM tokens using Firebase Admin SDK.
 *
 * @param {Array<string>} tokens - Array of FCM registration tokens
 * @param {Object} payload - Notification payload containing title, body, and optional data
 * @param {string} payload.title - Notification Title
 * @param {string} payload.body - Notification Body Message
 * @param {Object} [payload.data] - Key-value pair string object for custom navigation or metadata
 *
 * @returns {Promise<{successCount: number, failureCount: number, error?: string}>}
 */
export const sendMulticastPushNotification = async (tokens, payload) => {
  try {
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    // 1. Filter out empty, null, or non-string tokens
    const cleanTokens = tokens.filter(
      (token) => typeof token === "string" && token.trim().length > 0
    );

    if (cleanTokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    // 2. Format custom data payload (FCM data values must be strings)
    const formattedData = {};
    if (payload.data && typeof payload.data === "object") {
      Object.keys(payload.data).forEach((key) => {
        formattedData[key] = String(payload.data[key]);
      });
    }

    // 3. Batch tokens in chunks of 500 (Firebase FCM per-request limits)
    const MAX_BATCH_SIZE = 500;
    let totalSuccessCount = 0;
    let totalFailureCount = 0;

    for (let i = 0; i < cleanTokens.length; i += MAX_BATCH_SIZE) {
      const batchTokens = cleanTokens.slice(i, i + MAX_BATCH_SIZE);

      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: formattedData,
        tokens: batchTokens,
      };

      // Send multicast batch
      const response = await admin.messaging().sendEachForMulticast(message);
      totalSuccessCount += response.successCount;
      totalFailureCount += response.failureCount;
    }

    return {
      successCount: totalSuccessCount,
      failureCount: totalFailureCount,
    };
  } catch (error) {
    console.error("FCM Multicast Transmission Error:", error);
    return {
      successCount: 0,
      failureCount: tokens ? tokens.length : 0,
      error: error.message,
    };
  }
};
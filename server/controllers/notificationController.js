import User from "../models/userModel.js";
import Merchant from "../models/merchantModel.js";
import { sendMulticastPushNotification } from "../utils/notificationHelper.js";

// ==========================================
// 1. USER TOKEN & PREFERENCES CONTROLLERS
// ==========================================

/**
 * PATCH /api/user/fcm-token
 * Save or update the authenticated user's FCM token
 */
export const updateUserFcmToken = async (req, res) => {
  try {
    const userId = req.user._id;
    const { fcmToken, deviceType = "android" } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "FCM token is required.",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    user.fcmToken = fcmToken;

    // Maintain device array
    const existingIndex = user.fcmTokens?.findIndex((t) => t.token === fcmToken);
    if (existingIndex > -1) {
      user.fcmTokens[existingIndex].updatedAt = new Date();
    } else {
      user.fcmTokens.push({ token: fcmToken, deviceType });
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User FCM token updated successfully.",
    });
  } catch (error) {
    console.error("Update User FCM Token Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save FCM token.",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/user/notification-settings
 * Toggle user push notification preference ON/OFF
 */
export const toggleUserNotificationSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { isNotificationEnabled } = req.body;

    if (typeof isNotificationEnabled !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Field 'isNotificationEnabled' must be a boolean.",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isNotificationEnabled },
      { new: true }
    ).select("isNotificationEnabled");

    return res.status(200).json({
      success: true,
      message: `Notifications ${
        user.isNotificationEnabled ? "enabled" : "disabled"
      } successfully.`,
      isNotificationEnabled: user.isNotificationEnabled,
    });
  } catch (error) {
    console.error("Toggle User Notifications Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update notification settings.",
      error: error.message,
    });
  }
};

// ==========================================
// 2. MERCHANT TOKEN & PREFERENCES CONTROLLERS
// ==========================================

/**
 * PATCH /api/merchant/fcm-token
 * Save or update the authenticated merchant's FCM token
 */
export const updateMerchantFcmToken = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { fcmToken, deviceType = "android" } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "FCM token is required.",
      });
    }

    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant account not found.",
      });
    }

    merchant.fcmToken = fcmToken;

    // Maintain device array
    const existingIndex = merchant.fcmTokens?.findIndex(
      (t) => t.token === fcmToken
    );
    if (existingIndex > -1) {
      merchant.fcmTokens[existingIndex].updatedAt = new Date();
    } else {
      merchant.fcmTokens.push({ token: fcmToken, deviceType });
    }

    await merchant.save();

    return res.status(200).json({
      success: true,
      message: "Merchant FCM token updated successfully.",
    });
  } catch (error) {
    console.error("Update Merchant FCM Token Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save FCM token.",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/merchant/notification-settings
 * Toggle merchant push notification preference ON/OFF
 */
export const toggleMerchantNotificationSettings = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { isNotificationEnabled } = req.body;

    if (typeof isNotificationEnabled !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Field 'isNotificationEnabled' must be a boolean.",
      });
    }

    const merchant = await Merchant.findByIdAndUpdate(
      merchantId,
      { isNotificationEnabled },
      { new: true }
    ).select("isNotificationEnabled");

    return res.status(200).json({
      success: true,
      message: `Notifications ${
        merchant.isNotificationEnabled ? "enabled" : "disabled"
      } successfully.`,
      isNotificationEnabled: merchant.isNotificationEnabled,
    });
  } catch (error) {
    console.error("Toggle Merchant Notifications Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update notification settings.",
      error: error.message,
    });
  }
};

// ==========================================
// 3. UNIFIED PUSH NOTIFICATION DISPATCHER
// ==========================================

/**
 * POST /api/notifications/send
 * Target Options: "single_user" | "single_merchant" | "all_users" | "all_merchants" | "both"
 */

import Notification from "../models/Notification.js";
import { sendMulticastPushNotification } from "../utils/notificationHelper.js";

/**
 * Admin Panel & Broadcast Push Notification Controller
 * Dispatches multicast FCM push alerts and creates In-App Notification records in MongoDB.
 */
export const sendNotification = async (req, res) => {
  try {
    const { targetType, recipientId, title, body, data = {} } = req.body;

    if (!targetType || !title || !body) {
      return res.status(400).json({
        success: false,
        message: "Fields 'targetType', 'title', and 'body' are required.",
      });
    }

    const validTargets = [
      "all_users",
      "all_merchants",
      "both",
      "single_user",
      "single_merchant",
    ];

    if (!validTargets.includes(targetType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid targetType. Must be one of: ${validTargets.join(", ")}`,
      });
    }

    let tokensToNotify = [];
    const inAppDocs = [];

    // --- TARGET RESOLUTION LOGIC ---
    switch (targetType) {
      case "single_user": {
        if (!recipientId) {
          return res.status(400).json({
            success: false,
            message: "'recipientId' is required for targetType 'single_user'.",
          });
        }
        const user = await User.findOne({
          _id: recipientId,
          isNotificationEnabled: true,
          status: "active",
        }).select("_id fcmToken fcmTokens");

        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found or push notifications are disabled for this account.",
          });
        }

        if (user.fcmToken) tokensToNotify.push(user.fcmToken);
        if (user.fcmTokens?.length) {
          user.fcmTokens.forEach((t) => {
            const tokenStr = typeof t === "string" ? t : t.token;
            if (tokenStr) tokensToNotify.push(tokenStr);
          });
        }

        inAppDocs.push({
          recipientId: user._id,
          recipientType: "User",
          title,
          body,
          type: "GENERAL",
          data: { ...data, targetType },
          isRead: false,
        });
        break;
      }

      case "single_merchant": {
        if (!recipientId) {
          return res.status(400).json({
            success: false,
            message: "'recipientId' is required for targetType 'single_merchant'.",
          });
        }
        const merchant = await Merchant.findOne({
          _id: recipientId,
          isNotificationEnabled: true,
          isBlocked: false,
        }).select("_id fcmToken fcmTokens");

        if (!merchant) {
          return res.status(404).json({
            success: false,
            message: "Merchant not found or push notifications are disabled for this account.",
          });
        }

        if (merchant.fcmToken) tokensToNotify.push(merchant.fcmToken);
        if (merchant.fcmTokens?.length) {
          merchant.fcmTokens.forEach((t) => {
            const tokenStr = typeof t === "string" ? t : t.token;
            if (tokenStr) tokensToNotify.push(tokenStr);
          });
        }

        inAppDocs.push({
          recipientId: merchant._id,
          recipientType: "Merchant",
          title,
          body,
          type: "GENERAL",
          data: { ...data, targetType },
          isRead: false,
        });
        break;
      }

      case "all_users": {
        const users = await User.find({
          isNotificationEnabled: true,
          status: "active",
        }).select("_id fcmToken fcmTokens");

        users.forEach((u) => {
          if (u.fcmToken) tokensToNotify.push(u.fcmToken);
          if (u.fcmTokens?.length) {
            u.fcmTokens.forEach((t) => {
              const tokenStr = typeof t === "string" ? t : t.token;
              if (tokenStr) tokensToNotify.push(tokenStr);
            });
          }

          inAppDocs.push({
            recipientId: u._id,
            recipientType: "User",
            title,
            body,
            type: "GENERAL",
            data: { ...data, targetType },
            isRead: false,
          });
        });
        break;
      }

      case "all_merchants": {
        const merchants = await Merchant.find({
          isNotificationEnabled: true,
          isBlocked: false,
        }).select("_id fcmToken fcmTokens");

        merchants.forEach((m) => {
          if (m.fcmToken) tokensToNotify.push(m.fcmToken);
          if (m.fcmTokens?.length) {
            m.fcmTokens.forEach((t) => {
              const tokenStr = typeof t === "string" ? t : t.token;
              if (tokenStr) tokensToNotify.push(tokenStr);
            });
          }

          inAppDocs.push({
            recipientId: m._id,
            recipientType: "Merchant",
            title,
            body,
            type: "GENERAL",
            data: { ...data, targetType },
            isRead: false,
          });
        });
        break;
      }

      case "both": {
        const [users, merchants] = await Promise.all([
          User.find({ isNotificationEnabled: true, status: "active" }).select(
            "_id fcmToken fcmTokens"
          ),
          Merchant.find({ isNotificationEnabled: true, isBlocked: false }).select(
            "_id fcmToken fcmTokens"
          ),
        ]);

        users.forEach((u) => {
          if (u.fcmToken) tokensToNotify.push(u.fcmToken);
          if (u.fcmTokens?.length) {
            u.fcmTokens.forEach((t) => {
              const tokenStr = typeof t === "string" ? t : t.token;
              if (tokenStr) tokensToNotify.push(tokenStr);
            });
          }

          inAppDocs.push({
            recipientId: u._id,
            recipientType: "User",
            title,
            body,
            type: "GENERAL",
            data: { ...data, targetType },
            isRead: false,
          });
        });

        merchants.forEach((m) => {
          if (m.fcmToken) tokensToNotify.push(m.fcmToken);
          if (m.fcmTokens?.length) {
            m.fcmTokens.forEach((t) => {
              const tokenStr = typeof t === "string" ? t : t.token;
              if (tokenStr) tokensToNotify.push(tokenStr);
            });
          }

          inAppDocs.push({
            recipientId: m._id,
            recipientType: "Merchant",
            title,
            body,
            type: "GENERAL",
            data: { ...data, targetType },
            isRead: false,
          });
        });
        break;
      }

      default:
        break;
    }

    // 1. Bulk insert in-app notification records to MongoDB (chunks of 1,000)
    let savedInAppCount = 0;
    if (inAppDocs.length > 0) {
      const DB_BATCH_SIZE = 1000;
      for (let i = 0; i < inAppDocs.length; i += DB_BATCH_SIZE) {
        const batch = inAppDocs.slice(i, i + DB_BATCH_SIZE);
        const insertResult = await Notification.insertMany(batch, { ordered: false });
        savedInAppCount += insertResult.length;
      }
    }

    // 2. Deduplicate FCM tokens
    tokensToNotify = [...new Set(tokensToNotify.filter(Boolean))];

    if (tokensToNotify.length === 0) {
      return res.status(200).json({
        success: true,
        message: "In-app notifications saved, but no active device FCM tokens were found.",
        targetType,
        totalInAppSaved: savedInAppCount,
        totalTokensTargeted: 0,
        successCount: 0,
        failureCount: 0,
      });
    }

    // 3. Dispatch multicast push notifications via Firebase Admin SDK
    const result = await sendMulticastPushNotification(tokensToNotify, {
      title,
      body,
      data: {
        type: "GENERAL",
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        ...data,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Notification successfully created (${savedInAppCount} in-app records) and dispatched to ${tokensToNotify.length} devices.`,
      targetType,
      totalInAppSaved: savedInAppCount,
      totalTokensTargeted: tokensToNotify.length,
      successCount: result.successCount,
      failureCount: result.failureCount,
    });
  } catch (error) {
    console.error("Send Notification Exception:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to dispatch push notifications.",
      error: error.message,
    });
  }
};
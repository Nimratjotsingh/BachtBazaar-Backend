import admin from "../config/firebase.js";
import User from "../models/userModel.js";
import Notification from "../models/Notification.js";

/**
 * Dispatches notifications to users when a merchant assigns them a new milestone.
 *
 * @param {Object} params
 * @param {Array<string|ObjectId>} params.userIds - Array of targeted User IDs
 * @param {string} params.shopName - Name of the store or merchant
 * @param {string} params.milestoneTitle - Title of the challenge/goal
 * @param {number} params.targetCount - Required action target count
 * @param {string} params.rewardDescription - Reward unlocked upon completion
 * @param {string} params.actionType - REDEEM | CLAIM | OFFER_CLICK | FOOTFALL_VISIT
 * @param {string|ObjectId} params.merchantId - ID of the creating merchant
 */
export const notifyUsersForNewMilestone = async ({
  userIds,
  shopName,
  milestoneTitle,
  targetCount,
  rewardDescription,
  actionType,
  merchantId,
}) => {
  try {
    if (!userIds || !userIds.length) return;

    const displayShop = shopName || "A nearby merchant";
    const title = `🎯 New Reward Goal from ${displayShop}!`;
    const body = `Complete ${targetCount} ${actionType.toLowerCase()}(s) to win: "${rewardDescription}"!`;

    const notificationData = {
      type: "MILESTONE_CREATED",
      merchantId: merchantId.toString(),
      actionType,
      targetCount: targetCount.toString(),
    };

    // 1. Bulk create In-App Notification records in MongoDB
    const inAppNotifications = userIds.map((uId) => ({
      recipientId: uId,
      recipientType: "User",
      title,
      body,
      type: "MILESTONE_CREATED",
      data: notificationData,
      isRead: false,
    }));

    await Notification.insertMany(inAppNotifications);

    // 2. Fetch users with active FCM tokens
    const users = await User.find({
      _id: { $in: userIds },
      fcmToken: { $exists: true, $ne: null },
    })
      .select("fcmToken")
      .lean();

    const tokens = users
      .map((u) => u.fcmToken)
      .filter((t) => typeof t === "string" && t.trim().length > 0);

    if (!tokens.length) {
      console.log("[Milestone Notification] In-app records created, no active FCM tokens found.");
      return;
    }

    // 3. Dispatch Multicast Push Notification via Firebase
    const messagePayload = {
      notification: {
        title,
        body,
      },
      data: {
        type: "MILESTONE_CREATED",
        ...notificationData,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(messagePayload);
    console.log(
      `[Milestone Notification] Dispatched to ${response.successCount} device(s), ${response.failureCount} failed.`
    );
  } catch (error) {
    console.error("Failed to notify users for new milestone:", error.message);
  }
};
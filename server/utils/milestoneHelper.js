import UserMilestoneGoal from "../models/userMilestone.js";
import User from "../models/userModel.js";
import Notification from "../models/Notification.js";
import admin from "../config/firebase.js";

/**
 * Call this helper inside your redemption, claim, click, or footfall handlers.
 */
export const incrementUserMilestoneProgress = async (merchantId, userId, actionType) => {
  try {
    if (!merchantId || !userId || !actionType) return;

    // Find active milestone goals for this user & merchant matching actionType
    const activeGoals = await UserMilestoneGoal.find({
      merchantId,
      userId,
      actionType,
      status: "IN_PROGRESS",
      expiresAt: { $gt: new Date() },
    });

    for (const goal of activeGoals) {
      goal.currentCount += 1;

      if (goal.currentCount >= goal.targetCount) {
        goal.status = "COMPLETED";
        goal.completedAt = new Date();
        goal.rewardClaimCode = `RW-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        // Send Completion Alert
        await notifyMilestoneRewardUnlocked(goal);
      }

      await goal.save();
    }
  } catch (error) {
    console.error("[Milestone Tracker Error]:", error.message);
  }
};

/**
 * Sends in-app and push notification when progress reaches 100%
 */
const notifyMilestoneRewardUnlocked = async (goal) => {
  try {
    const title = "🎉 Milestone Reward Unlocked!";
    const body = `You achieved the target for "${goal.title}"! Reward: ${goal.rewardDescription}. Code: ${goal.rewardClaimCode}`;
    const notificationData = {
      goalId: goal._id.toString(),
      rewardCode: goal.rewardClaimCode,
      merchantId: goal.merchantId.toString(),
    };

    // 1. In-App Notification
    await Notification.create({
      recipientId: goal.userId,
      recipientType: "User",
      title,
      body,
      type: "GENERAL",
      data: notificationData,
      isRead: false,
    });

    // 2. System Push Notification
    const user = await User.findById(goal.userId).select("fcmTokens").lean();
    if (user?.fcmTokens?.length) {
      await admin.messaging().sendEachForMulticast({
        notification: { title, body },
        data: {
          type: "MILESTONE_UNLOCKED",
          ...notificationData,
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
        tokens: user.fcmTokens.filter(Boolean),
      });
    }
  } catch (err) {
    console.error("Failed to notify user for milestone unlock:", err.message);
  }
};
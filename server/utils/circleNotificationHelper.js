import admin from "../config/firebase.js";
import User from "../models/userModel.js";
import Notification from "../models/Notification.js";

/**
 * Notify a user when invited to join a Bachat Circle
 * - Creates an In-App Notification in DB
 * - Dispatches a Push Notification via FCM
 */
export const notifyUserForCircleInvitation = async ({
  invitedUserId,
  inviterName,
  circleName,
  circleId,
  invitationId,
}) => {
  try {
    if (!invitedUserId) return;

    const title = "🤝 Bachat Circle Invite!";
    const body = `${inviterName} invited you to join the "${circleName}" Circle. Tap to view and accept!`;
    const notificationData = {
      circleId: circleId.toString(),
      invitationId: invitationId.toString(),
    };

    // 1. Create In-App Notification record in MongoDB
    await Notification.create({
      recipientId: invitedUserId,
      recipientType: "User",
      title,
      body,
      type: "CIRCLE_INVITATION",
      data: notificationData,
      isRead: false,
    });

    // 2. Fetch device FCM tokens for push notification
    const user = await User.findById(invitedUserId).select("fcmTokens name").lean();
    if (!user?.fcmTokens?.length) {
      console.log(`[Circle Invite Alert] In-app record saved, but no active FCM tokens found for user: ${invitedUserId}`);
      return;
    }

    // 3. Dispatch Push Notification
    const messagePayload = {
      notification: {
        title,
        body,
      },
      data: {
        type: "CIRCLE_INVITATION",
        ...notificationData,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      tokens: user.fcmTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(messagePayload);
    console.log(
      `[Circle Invite Notification] Sent to ${user.name}: ${response.successCount} delivered, ${response.failureCount} failed.`
    );
  } catch (error) {
    console.error("Circle invite notification error:", error.message);
  }
};

/**
 * Notify circle members when an offer is shared
 * - Creates In-App Notification records in bulk for all recipients
 * - Dispatches Multicast Push Notification via FCM
 */
export const notifyMembersForSharedOffer = async ({
  memberUserIds,
  senderName,
  circleName,
  offerTitle,
  circleId,
  sharedOfferId,
}) => {
  try {
    if (!memberUserIds?.length) return;

    const title = `🎁 New Offer Shared in "${circleName}"`;
    const body = `${senderName} shared "${offerTitle}". Check out the savings together!`;
    const notificationData = {
      circleId: circleId.toString(),
      sharedOfferId: sharedOfferId.toString(),
    };

    // 1. Bulk create In-App Notification records for all target members
    const inAppNotifications = memberUserIds.map((userId) => ({
      recipientId: userId,
      recipientType: "User",
      title,
      body,
      type: "CIRCLE_SHARED_OFFER",
      data: notificationData,
      isRead: false,
    }));

    await Notification.insertMany(inAppNotifications);

    // 2. Fetch active device tokens for the recipients
    const users = await User.find({
      _id: { $in: memberUserIds },
      fcmTokens: { $exists: true, $not: { $size: 0 } },
    })
      .select("fcmTokens")
      .lean();

    const allTokens = users.flatMap((u) => u.fcmTokens || []).filter(Boolean);
    if (!allTokens.length) {
      console.log("[Circle Offer Alert] In-app records created, but no active FCM tokens found.");
      return;
    }

    // 3. Dispatch Push Notifications
    const messagePayload = {
      notification: {
        title,
        body,
      },
      data: {
        type: "CIRCLE_SHARED_OFFER",
        ...notificationData,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      tokens: allTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(messagePayload);
    console.log(
      `[Circle Offer Shared Notification] Sent to ${allTokens.length} device(s): ${response.successCount} delivered, ${response.failureCount} failed.`
    );
  } catch (error) {
    console.error("Circle shared offer notification error:", error.message);
  }
};
import User from "../models/userModel.js";
import Merchant from "../models/merchantModel.js";
import { sendBirthdayPushNotification } from "../utils/birthdayNotificationHelper.js";

/**
 * Scans User and Merchant models for today's birthdays,
 * creates in-app database notifications, and dispatches FCM system push notifications.
 */
export const processDailyBirthdayNotifications = async () => {
  const today = new Date();
  const currentMonth = today.getMonth() + 1; // MongoDB $month aggregation is 1-indexed (1-12)
  const currentDay = today.getDate();

  console.log(
    `[Cron Job] Running Birthday Notification Scan for Date (MM/DD): ${currentMonth}/${currentDay}...`
  );

  try {
    // 1. Find Users whose 'dob' month and day match today
    const usersWithBirthday = await User.find({
      dob: { $exists: true, $ne: null },
      $expr: {
        $and: [
          { $eq: [{ $month: "$dob" }, currentMonth] },
          { $eq: [{ $dayOfMonth: "$dob" }, currentDay] },
        ],
      },
    })
      .select("_id name fcmTokens")
      .lean();

    // 2. Find Merchants whose 'dob' month and day match today
    const merchantsWithBirthday = await Merchant.find({
      dob: { $exists: true, $ne: null },
      isBlocked: { $ne: true },
      status: { $ne: "banned" },
      $expr: {
        $and: [
          { $eq: [{ $month: "$dob" }, currentMonth] },
          { $eq: [{ $dayOfMonth: "$dob" }, currentDay] },
        ],
      },
    })
      .select("_id name store_name fcmTokens")
      .lean();

    // 3. Dispatch Birthday Notifications for Users (In-App + FCM Push)
    for (const user of usersWithBirthday) {
      await sendBirthdayPushNotification(
        user._id,
        user.fcmTokens || [],
        user.name,
        "USER"
      );
    }

    // 4. Dispatch Birthday Notifications for Merchants (In-App + FCM Push)
    for (const merchant of merchantsWithBirthday) {
      const displayName = merchant.store_name || merchant.name;
      await sendBirthdayPushNotification(
        merchant._id,
        merchant.fcmTokens || [],
        displayName,
        "MERCHANT"
      );
    }

    console.log(
      `[Cron Job] Successfully processed birthday notifications for ${usersWithBirthday.length} user(s) and ${merchantsWithBirthday.length} merchant(s).`
    );
  } catch (error) {
    console.error("[Cron Job Error] Failed to process birthday notifications:", error);
  }
};
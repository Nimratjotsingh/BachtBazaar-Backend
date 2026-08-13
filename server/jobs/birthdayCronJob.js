import User from "../models/userModel.js";
import Merchant from "../models/merchantModel.js";
import { sendBirthdayPushNotification } from "../utils/birthdayNotificationHelper.js";

/**
 * Scans User and Merchant models for today's birthdays and sends system push notifications.
 */
export const processDailyBirthdayNotifications = async () => {
  const today = new Date();
  const currentMonth = today.getMonth() + 1; // MongoDB $month aggregation is 1-indexed
  const currentDay = today.getDate();

  console.log(`[Cron Job] Running Birthday Notification Scan for Date: ${currentMonth}/${currentDay}...`);

  try {
    // 1. Find Users whose 'dob' month and day match today
    const usersWithBirthday = await User.find({
      $expr: {
        $and: [
          { $eq: [{ $month: "$dob" }, currentMonth] },
          { $eq: [{ $dayOfMonth: "$dob" }, currentDay] },
        ],
      },
      fcmTokens: { $exists: true, $not: { $size: 0 } },
    })
      .select("name fcmTokens")
      .lean();

    // 2. Find Merchants whose 'dob' month and day match today
    const merchantsWithBirthday = await Merchant.find({
      $expr: {
        $and: [
          { $eq: [{ $month: "$dob" }, currentMonth] },
          { $eq: [{ $dayOfMonth: "$dob" }, currentDay] },
        ],
      },
      fcmTokens: { $exists: true, $not: { $size: 0 } },
    })
      .select("name store_name fcmTokens")
      .lean();

    // 3. Dispatch Push Notifications for Users
    for (const user of usersWithBirthday) {
      if (user.fcmTokens && user.fcmTokens.length > 0) {
        await sendBirthdayPushNotification(user.fcmTokens, user.name, "USER");
      }
    }

    // 4. Dispatch Push Notifications for Merchants
    for (const merchant of merchantsWithBirthday) {
      if (merchant.fcmTokens && merchant.fcmTokens.length > 0) {
        const displayName = merchant.store_name || merchant.name;
        await sendBirthdayPushNotification(merchant.fcmTokens, displayName, "MERCHANT");
      }
    }

    console.log(
      `[Cron Job] Successfully processed birthday notifications for ${usersWithBirthday.length} user(s) and ${merchantsWithBirthday.length} merchant(s).`
    );
  } catch (error) {
    console.error("[Cron Job Error] Failed to process birthday notifications:", error);
  }
};
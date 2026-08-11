// utils/streakHelper.js
import MerchantProgress from "../models/MerchantProgress.js";

export async function recordMerchantLogin(merchantId) {
  try {
    let progress = await MerchantProgress.findOne({ merchantId });

    if (!progress) {
      progress = new MerchantProgress({ merchantId });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (!progress.lastLoginDate) {
      // First active day recorded
      progress.currentLoginStreak = 1;
      progress.longestLoginStreak = 1;
      progress.totalLogins = 1;
      progress.lastLoginDate = now;
      await progress.save();
    } else {
      const lastLogin = new Date(progress.lastLoginDate);
      const lastLoginDay = new Date(
        lastLogin.getFullYear(),
        lastLogin.getMonth(),
        lastLogin.getDate()
      );

      const diffTime = today.getTime() - lastLoginDay.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

      if (diffDays === 1) {
        // Active on consecutive calendar day -> Increment streak
        progress.currentLoginStreak += 1;
        progress.totalLogins += 1;
        if (progress.currentLoginStreak > progress.longestLoginStreak) {
          progress.longestLoginStreak = progress.currentLoginStreak;
        }
        progress.lastLoginDate = now;
        await progress.save();
      } else if (diffDays > 1) {
        // Missed one or more days -> Reset streak to 1
        progress.currentLoginStreak = 1;
        progress.totalLogins += 1;
        progress.lastLoginDate = now;
        await progress.save();
      }
      // If diffDays === 0, the merchant was already active today -> No DB write needed
    }
  } catch (error) {
    console.error("Streak Tracking Exception:", error);
  }
}
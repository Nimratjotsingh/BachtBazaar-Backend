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
      // First time logging in
      progress.currentLoginStreak = 1;
      progress.longestLoginStreak = 1;
      progress.totalLogins = 1;
      progress.lastLoginDate = now;
    } else {
      const lastLogin = new Date(progress.lastLoginDate);
      const lastLoginDay = new Date(
        lastLogin.getFullYear(),
        lastLogin.getMonth(),
        lastLogin.getDate()
      );

      // Difference in days
      const diffTime = today.getTime() - lastLoginDay.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

      if (diffDays === 1) {
        // Logged in on consecutive day -> increment streak
        progress.currentLoginStreak += 1;
        progress.totalLogins += 1;
        if (progress.currentLoginStreak > progress.longestLoginStreak) {
          progress.longestLoginStreak = progress.currentLoginStreak;
        }
        progress.lastLoginDate = now;
      } else if (diffDays > 1) {
        // Missed a day or more -> reset streak to 1
        progress.currentLoginStreak = 1;
        progress.totalLogins += 1;
        progress.lastLoginDate = now;
      }
      // If diffDays === 0, merchant logged in again on the same day -> do nothing
    }

    await progress.save();
    return progress;
  } catch (error) {
    console.error("Error recording merchant login streak:", error);
  }
}
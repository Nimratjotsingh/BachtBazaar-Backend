import crypto from "crypto";
import User from "../models/userModel.js";
import Referral from "../models/Referal.js";
import Notification from "../models/Notification.js";
import admin from "../config/firebase.js";

/**
 * Generates a unique 6-character uppercase alphanumeric code
 */
export const generateUniqueReferralCode = async () => {
  let code;
  let exists = true;

  while (exists) {
    code = crypto.randomBytes(3).toString("hex").toUpperCase(); // e.g. 'A1B2C3'
    const found = await User.findOne({ referralCode: code }).select("_id");
    if (!found) exists = false;
  }

  return code;
};

/**
 * Processes referral link during registration
 */
export const processUserReferral = async (newUserId, referralCode) => {
  try {
    if (!referralCode || !newUserId) return;

    const cleanCode = referralCode.trim().toUpperCase();
    const referrer = await User.findOne({ referralCode: cleanCode });

    if (!referrer || referrer._id.toString() === newUserId.toString()) {
      return; // Code not found or self-referral
    }

    // 1. Link referrer to new user
    await User.findByIdAndUpdate(newUserId, { referredBy: referrer._id });

    // 2. Increment referrer's count
    await User.findByIdAndUpdate(referrer._id, { $inc: { referralCount: 1 } });

    // 3. Create referral log record
    const referralRecord = new Referral({
      referrerId: referrer._id,
      referredUserId: newUserId,
      referralCodeUsed: cleanCode,
    });
    await referralRecord.save();

    // 4. Send In-App Notification & Push Notification to Referrer
    const newUser = await User.findById(newUserId).select("name").lean();
    const newUserName = newUser?.name || "A new friend";

    const title = "👥 New Friend Joined!";
    const body = `${newUserName} just joined BachatBazarr using your referral code!`;

    await Notification.create({
      recipientId: referrer._id,
      recipientType: "User",
      title,
      body,
      type: "GENERAL",
      data: {
        type: "REFERRAL_JOINED",
        referredUserId: newUserId.toString(),
      },
      isRead: false,
    });

    if (referrer.fcmTokens?.length) {
      await admin.messaging().sendEachForMulticast({
        notification: { title, body },
        data: {
          type: "REFERRAL_JOINED",
          referredUserId: newUserId.toString(),
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
        tokens: referrer.fcmTokens.filter(Boolean),
      });
    }
  } catch (error) {
    console.error("[Referral Processing Error]:", error.message);
  }
};
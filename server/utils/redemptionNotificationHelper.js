import admin from "../config/firebase.js";
import User from "../models/userModel.js";
import Merchant from "../models/merchantModel.js";
import Notification from "../models/Notification.js";

/**
 * Notifies both User and Merchant on successful offer redemption.
 */
export const notifyOnOfferRedemption = async ({
  userId,
  merchantId,
  offerId,
  offerTitle,
  redemptionCode,
  expiresAt,
  userName,
}) => {
  try {
    const formattedExpiry = new Date(expiresAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
    });

    // ----------------------------------------------------
    // 1. Prepare User Notification (Confirmation & Code)
    // ----------------------------------------------------
    const userTitle = "🎟️ Offer Redeemed Successfully!";
    const userBody = `Your code for "${offerTitle}" is ${redemptionCode}. Valid until ${formattedExpiry}.`;
    const userDataPayload = {
      type: "OFFER_REDEEMED_USER",
      offerId: offerId.toString(),
      redemptionCode,
      expiresAt: new Date(expiresAt).toISOString(),
    };

    // Save In-App record for User
    await Notification.create({
      recipientId: userId,
      recipientType: "User",
      title: userTitle,
      body: userBody,
      type: "GENERAL",
      data: userDataPayload,
      isRead: false,
    });

    // Send FCM Push to User
    const user = await User.findById(userId).select("fcmToken").lean();
    if (user?.fcmToken) {
      await admin.messaging().send({
        notification: { title: userTitle, body: userBody },
        data: {
          ...userDataPayload,
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
        token: user.fcmToken,
      });
    }

    // ----------------------------------------------------
    // 2. Prepare Merchant Notification (New Customer Claim Alert)
    // ----------------------------------------------------
    const customerDisplayName = userName || "A customer";
    const merchantTitle = "🛍️ New Offer Claimed!";
    const merchantBody = `${customerDisplayName} just redeemed "${offerTitle}". Code: ${redemptionCode}.`;
    const merchantDataPayload = {
      type: "OFFER_REDEEMED_MERCHANT",
      offerId: offerId.toString(),
      redemptionCode,
      userId: userId.toString(),
    };

    // Save In-App record for Merchant
    await Notification.create({
      recipientId: merchantId,
      recipientType: "Merchant",
      title: merchantTitle,
      body: merchantBody,
      type: "GENERAL",
      data: merchantDataPayload,
      isRead: false,
    });

    // Send FCM Push to Merchant
    const merchant = await Merchant.findById(merchantId).select("fcmToken fcmTokens").lean();
    const merchantToken = merchant?.fcmToken || (merchant?.fcmTokens && merchant.fcmTokens[0]);

    if (merchantToken) {
      await admin.messaging().send({
        notification: { title: merchantTitle, body: merchantBody },
        data: {
          ...merchantDataPayload,
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
        token: merchantToken,
      });
    }
  } catch (error) {
    console.error("[Redemption Notification Error]:", error.message);
  }
};
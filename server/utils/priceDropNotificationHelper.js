import admin from "../config/firebase.js";
import Wishlist from "../models/wishlistModel.js";
import User from "../models/userModel.js";
import Notification from "../models/Notification.js";

/**
 * Checks for price drops and notifies all users who saved the product/service in their wishlist.
 *
 * @param {Object} params
 * @param {string|ObjectId} params.itemId - Product or Service ObjectId
 * @param {"products" | "services"} params.itemType - "products" or "services"
 * @param {string} params.itemTitle - Title/Name of the item
 * @param {number} params.oldPrice - Previous price before update
 * @param {number} params.newPrice - Updated new price
 * @param {string} [params.thumbnail] - Item image URL (optional)
 * @param {string|ObjectId} [params.merchantId] - Shop/Merchant ObjectId (optional)
 */
export const notifyWishlistUsersOnPriceDrop = async ({
  itemId,
  itemType, // "products" | "services"
  itemTitle,
  oldPrice,
  newPrice,
  thumbnail = "",
  merchantId = null,
}) => {
  try {
    const prev = Number(oldPrice);
    const curr = Number(newPrice);

    // 1. Validate price decrease
    if (isNaN(prev) || isNaN(curr) || curr >= prev) {
      return { success: false, message: "Price did not decrease." };
    }

    const priceDifference = (prev - curr).toFixed(2);
    const discountPercentage = Math.round(((prev - curr) / prev) * 100);

    // 2. Find all users who wishlisted this item
    const wishlists = await Wishlist.find({
      [itemType]: itemId,
    }).select("userId").lean();

    if (!wishlists || wishlists.length === 0) {
      return { success: true, targetedUsers: 0, message: "No users have wishlisted this item." };
    }

    const userIds = wishlists.map((w) => w.userId).filter(Boolean);

    // 3. Fetch active users with notifications enabled
    const users = await User.find({
      _id: { $in: userIds },
      isNotificationEnabled: true,
      status: "active",
    }).select("_id fcmToken fcmTokens").lean();

    if (users.length === 0) {
      return { success: true, targetedUsers: 0 };
    }

    const isService = itemType === "services";
    const entityLabel = isService ? "Service" : "Product";

    const title = `📉 Price Drop Alert: ${itemTitle}`;
    const body = `Good news! "${itemTitle}" from your wishlist is now ₹${curr} (${discountPercentage}% OFF, save ₹${priceDifference}).`;

    const dataPayload = {
      type: "PRICE_DROP",
      itemType: entityLabel.toUpperCase(),
      itemId: itemId.toString(),
      merchantId: merchantId ? merchantId.toString() : "",
      oldPrice: String(prev),
      newPrice: String(curr),
      discountPercentage: String(discountPercentage),
      thumbnail: thumbnail || "",
      click_action: "FLUTTER_NOTIFICATION_CLICK",
    };

    // 4. Bulk insert In-App Notification records (chunked in batches of 1,000)
    let savedInAppCount = 0;
    const DB_BATCH_SIZE = 1000;

    for (let i = 0; i < users.length; i += DB_BATCH_SIZE) {
      const userBatch = users.slice(i, i + DB_BATCH_SIZE);
      const inAppDocs = userBatch.map((user) => ({
        recipientId: user._id,
        recipientType: "User",
        title,
        body,
        type: "PRICE_DROP",
        data: dataPayload,
        isRead: false,
      }));

      const insertResult = await Notification.insertMany(inAppDocs, { ordered: false });
      savedInAppCount += insertResult.length;
    }

    // 5. Extract and deduplicate valid device FCM tokens
    const rawTokens = [];
    users.forEach((u) => {
      if (u.fcmToken) rawTokens.push(u.fcmToken.trim());
      if (u.fcmTokens?.length) {
        u.fcmTokens.forEach((t) => {
          const tokenStr = typeof t === "string" ? t : t?.token;
          if (tokenStr && typeof tokenStr === "string") rawTokens.push(tokenStr.trim());
        });
      }
    });

    const cleanTokens = [...new Set(rawTokens.filter(Boolean))];

    if (cleanTokens.length === 0) {
      return {
        success: true,
        targetedUsers: users.length,
        savedInAppCount,
        totalTokensTargeted: 0,
        successCount: 0,
        failureCount: 0,
      };
    }

    // 6. Multicast batch push notifications using Firebase Admin SDK (chunked by 500)
    const FCM_BATCH_SIZE = 500;
    let totalSuccessCount = 0;
    let totalFailureCount = 0;

    for (let i = 0; i < cleanTokens.length; i += FCM_BATCH_SIZE) {
      const batchTokens = cleanTokens.slice(i, i + FCM_BATCH_SIZE);

      const message = {
        notification: {
          title,
          body,
        },
        data: dataPayload,
        tokens: batchTokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      totalSuccessCount += response.successCount;
      totalFailureCount += response.failureCount;
    }

    return {
      success: true,
      targetedUsers: users.length,
      savedInAppCount,
      totalTokensTargeted: cleanTokens.length,
      successCount: totalSuccessCount,
      failureCount: totalFailureCount,
    };
  } catch (error) {
    console.error("[Price Drop Wishlist Notification Error]:", error);
    return { success: false, error: error.message };
  }
};
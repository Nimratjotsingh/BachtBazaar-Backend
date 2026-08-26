import admin from "../config/firebase.js";
import User from "../models/userModel.js";
import Notification from "../models/Notification.js";
import MerchantShop from "../models/merchantShopModel.js";

// Haversine formula to compute spherical distance between two points in km
const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Dispatches Push & In-App notifications to nearby users (within target radius)
 * when a merchant launches a new offer.
 */
export const notifyNearbyUsersForNewOffer = async ({
  offerId,
  offerTitle,
  discountPercentage,
  discountValue,
  merchantId,
  lat,
  lng,
  targetRadiusKm = 15,
}) => {
  try {
    if (!lat || !lng || !offerId) return;

    // 1. Fetch shop/merchant details for brand context
    const shop = await MerchantShop.findOne({ merchantId })
      .select("shopName")
      .lean();
    const storeName = shop?.shopName || "A nearby store";

    // 2. Bounding Box pre-filter for performance
    const kmPerDegreeLat = 111.1;
    const kmPerDegreeLng = 111.1 * Math.cos((lat * Math.PI) / 180);

    const latDelta = targetRadiusKm / kmPerDegreeLat;
    const lngDelta = targetRadiusKm / kmPerDegreeLng;

    const candidateUsers = await User.find({
      latitude: { $gte: lat - latDelta, $lte: lat + latDelta },
      longitude: { $gte: lng - lngDelta, $lte: lng + lngDelta },
      isDeleted: { $ne: true },
      status: { $ne: "banned" },
    })
      .select("_id fcmToken latitude longitude name")
      .lean();

    // 3. Exact Haversine distance verification
    const nearbyUsers = candidateUsers.filter((user) => {
      if (user.latitude != null && user.longitude != null) {
        const distance = getDistanceKm(lat, lng, user.latitude, user.longitude);
        return distance <= targetRadiusKm;
      }
      return false;
    });

    if (nearbyUsers.length === 0) return;

    // Build notification copy
    const discountText = discountPercentage
      ? `${discountPercentage}% OFF`
      : discountValue
      ? `₹${discountValue} OFF`
      : "Special Deal";

    const title = `🔥 New Offer Nearby: ${discountText}!`;
    const body = `${storeName} just published "${offerTitle}". Tap to explore and claim!`;

    const notificationData = {
      type: "GENERAL",
      subType: "NEW_OFFER_NEARBY",
      offerId: offerId.toString(),
      merchantId: merchantId.toString(),
    };

    // 4. Batch insert in-app notification documents into MongoDB
    const inAppNotifications = nearbyUsers.map((user) => ({
      recipientId: user._id,
      recipientType: "User",
      title,
      body,
      type: "GENERAL",
      data: notificationData,
      isRead: false,
    }));

    await Notification.insertMany(inAppNotifications);

    // 5. Collect valid, non-empty FCM tokens
    const tokens = nearbyUsers
      .map((u) => u.fcmToken)
      .filter((token) => typeof token === "string" && token.trim().length > 0);

    if (tokens.length === 0) {
      console.log("[New Offer Alert] In-app records created, but no active FCM tokens found.");
      return;
    }

    // 6. Dispatch Multicast Push Notification via Firebase in batches of 500
    const MAX_BATCH_SIZE = 500;
    for (let i = 0; i < tokens.length; i += MAX_BATCH_SIZE) {
      const batchTokens = tokens.slice(i, i + MAX_BATCH_SIZE);

      const messagePayload = {
        notification: { title, body },
        data: {
          ...notificationData,
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
        tokens: batchTokens,
      };

      const response = await admin.messaging().sendEachForMulticast(messagePayload);
      console.log(
        `[New Offer Alert] Dispatched to batch (${response.successCount} delivered, ${response.failureCount} failed).`
      );
    }
  } catch (error) {
    console.error("Failed to notify nearby users of new offer:", error.message);
  }
};
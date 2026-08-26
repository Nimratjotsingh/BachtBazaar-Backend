import MerchantDailyAnalytics from "../models/MerchantDailyAnalytics.js";
import OfferAnalytics from "../models/offerDailyAnalytics.js";

/**
 * Tracks shop-specific daily metrics (Shop-level) with user logging & deduplication.
 * @param {String|ObjectId} shopId 
 * @param {String|ObjectId} merchantId 
 * @param {String} metricField - "totalViewers" | "offerClicks" | "redeems" | "footfall" | "bannerViews"
 * @param {Object|String|null} [userData=null] - { userId, offerId, redemptionCode } or userId string
 * @param {Number} [count=1] - Amount to increment
 */
export const trackDailyMetric = async (
  shopId,
  merchantId,
  metricField,
  userData = null,
  count = 1
) => {
  try {
    if (!shopId || !merchantId || !metricField) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const userId = typeof userData === "object" ? userData?.userId : userData;
    const offerId = typeof userData === "object" ? userData?.offerId : null;
    const redemptionCode = typeof userData === "object" ? userData?.redemptionCode || "" : "";

    const baseFilter = { merchantId, shopId, date: today };

    if (userId) {
      if (metricField === "totalViewers" || metricField === "bannerViews") {
        // Unique per user per day: Only increment and log if userId not already in viewerUsers
        await MerchantDailyAnalytics.updateOne(
          { ...baseFilter, "viewerUsers.userId": { $ne: userId } },
          {
            $push: { viewerUsers: { userId, viewedAt: new Date() } },
            $inc: { totalViewers: count },
          },
          { upsert: false }
        ).then(async (res) => {
          // If document didn't exist yet for today, upsert it safely
          if (res.matchedCount === 0) {
            await MerchantDailyAnalytics.findOneAndUpdate(
              baseFilter,
              {
                $setOnInsert: { date: today, merchantId, shopId },
                $addToSet: { viewerUsers: { userId, viewedAt: new Date() } },
                $inc: { totalViewers: count },
              },
              { upsert: true, new: true }
            );
          }
        });
      } else if (metricField === "offerClicks") {
        // Unique per user per day for this merchant/shop
        await MerchantDailyAnalytics.updateOne(
          { ...baseFilter, "clickedUsers.userId": { $ne: userId } },
          {
            $push: { clickedUsers: { userId, offerId, clickedAt: new Date() } },
            $inc: { offerClicks: count },
          },
          { upsert: false }
        ).then(async (res) => {
          if (res.matchedCount === 0) {
            await MerchantDailyAnalytics.findOneAndUpdate(
              baseFilter,
              {
                $setOnInsert: { date: today, merchantId, shopId },
                $addToSet: { clickedUsers: { userId, offerId, clickedAt: new Date() } },
                $inc: { offerClicks: count },
              },
              { upsert: true, new: true }
            );
          }
        });
      } else if (metricField === "redeems") {
        await MerchantDailyAnalytics.findOneAndUpdate(
          baseFilter,
          {
            $push: { redeemedUsers: { userId, offerId, redemptionCode, redeemedAt: new Date() } },
            $inc: { redeems: count },
          },
          { upsert: true, new: true }
        );
      } else if (metricField === "footfall") {
        await MerchantDailyAnalytics.findOneAndUpdate(
          baseFilter,
          {
            $push: { footfallUsers: { userId, offerId, redemptionCode, visitedAt: new Date() } },
            $inc: { footfall: count },
          },
          { upsert: true, new: true }
        );
      }
    } else {
      // Anonymous / non-user-specific increments
      const dbField = metricField === "bannerViews" ? "totalViewers" : metricField;
      await MerchantDailyAnalytics.findOneAndUpdate(
        baseFilter,
        { $inc: { [dbField]: count } },
        { upsert: true, new: true }
      );
    }
  } catch (error) {
    console.error(`Failed to track shop daily metric [${metricField}]:`, error.message);
  }
};

/**
 * Tracks merchant-level daily metrics (shopId: null) with strict user-level deduplication for totalViewers & offerClicks.
 */
export const trackDailyMetric2 = async (
  merchantId,
  metricField,
  userData = null,
  count = 1
) => {
  try {
    if (!merchantId || !metricField) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const userId = typeof userData === "object" ? userData?.userId : userData;
    const offerId = typeof userData === "object" ? userData?.offerId : null;
    const redemptionCode = typeof userData === "object" ? userData?.redemptionCode || "" : "";

    const baseFilter = { merchantId, shopId: null, date: today };

    if (userId) {
      if (metricField === "totalViewers" || metricField === "bannerViews") {
        // Only increment if userId does not exist in viewerUsers for today
        await MerchantDailyAnalytics.updateOne(
          { ...baseFilter, "viewerUsers.userId": { $ne: userId } },
          {
            $push: { viewerUsers: { userId, viewedAt: new Date() } },
            $inc: { totalViewers: count },
          },
          { upsert: false }
        ).then(async (res) => {
          if (res.matchedCount === 0) {
            await MerchantDailyAnalytics.findOneAndUpdate(
              baseFilter,
              {
                $setOnInsert: { date: today, merchantId, shopId: null },
                $addToSet: { viewerUsers: { userId, viewedAt: new Date() } },
                $inc: { totalViewers: count },
              },
              { upsert: true, new: true }
            );
          }
        });
      } else if (metricField === "offerClicks") {
        // Only increment if userId does not exist in clickedUsers for today
        await MerchantDailyAnalytics.updateOne(
          { ...baseFilter, "clickedUsers.userId": { $ne: userId } },
          {
            $push: { clickedUsers: { userId, offerId, clickedAt: new Date() } },
            $inc: { offerClicks: count },
          },
          { upsert: false }
        ).then(async (res) => {
          if (res.matchedCount === 0) {
            await MerchantDailyAnalytics.findOneAndUpdate(
              baseFilter,
              {
                $setOnInsert: { date: today, merchantId, shopId: null },
                $addToSet: { clickedUsers: { userId, offerId, clickedAt: new Date() } },
                $inc: { offerClicks: count },
              },
              { upsert: true, new: true }
            );
          }
        });
      } else if (metricField === "redeems") {
        await MerchantDailyAnalytics.findOneAndUpdate(
          baseFilter,
          {
            $push: { redeemedUsers: { userId, offerId, redemptionCode, redeemedAt: new Date() } },
            $inc: { redeems: count },
          },
          { upsert: true, new: true }
        );
      } else if (metricField === "footfall") {
        await MerchantDailyAnalytics.findOneAndUpdate(
          baseFilter,
          {
            $push: { footfallUsers: { userId, offerId, redemptionCode, visitedAt: new Date() } },
            $inc: { footfall: count },
          },
          { upsert: true, new: true }
        );
      }
    } else {
      const dbField = metricField === "bannerViews" ? "totalViewers" : metricField;
      await MerchantDailyAnalytics.findOneAndUpdate(
        baseFilter,
        { $inc: { [dbField]: count } },
        { upsert: true, new: true }
      );
    }
  } catch (error) {
    console.error(`Failed to track merchant daily metric [${metricField}]:`, error.message);
  }
};

/**
 * Tracks offer-level metrics with strict user-level deduplication for clicks.
 */
export const trackOfferMetric = async (
  offerId,
  merchantId,
  metricField,
  userData = null,
  count = 1
) => {
  try {
    if (!offerId || !merchantId || !metricField) return;

    const userId = typeof userData === "object" ? userData?.userId : userData;
    const redemptionCode = typeof userData === "object" ? userData?.redemptionCode || "" : "";

    const baseFilter = { offerId, merchantId };

    if (userId) {
      if (metricField === "clicks") {
        // Only increment and record if this user has never clicked this offer before
        await OfferAnalytics.updateOne(
          { ...baseFilter, "clickedUsers.userId": { $ne: userId } },
          {
            $push: { clickedUsers: { userId, clickedAt: new Date() } },
            $inc: { clicks: count },
          },
          { upsert: false }
        ).then(async (res) => {
          if (res.matchedCount === 0) {
            await OfferAnalytics.findOneAndUpdate(
              baseFilter,
              {
                $setOnInsert: { offerId, merchantId },
                $addToSet: { clickedUsers: { userId, clickedAt: new Date() } },
                $inc: { clicks: count },
              },
              { upsert: true, new: true }
            );
          }
        });
      } else if (metricField === "redeems") {
        await OfferAnalytics.findOneAndUpdate(
          baseFilter,
          {
            $push: { redeemedUsers: { userId, redemptionCode, redeemedAt: new Date() } },
            $inc: { redeems: count },
          },
          { upsert: true, new: true }
        );
      } else if (metricField === "claims") {
        await OfferAnalytics.findOneAndUpdate(
          baseFilter,
          {
            $push: { claimedUsers: { userId, redemptionCode, claimedAt: new Date() } },
            $inc: { claims: count },
          },
          { upsert: true, new: true }
        );
      } else if (metricField === "footfall") {
        await OfferAnalytics.findOneAndUpdate(
          baseFilter,
          {
            $push: { footfallUsers: { userId, redemptionCode, visitedAt: new Date() } },
            $inc: { footfall: count },
          },
          { upsert: true, new: true }
        );
      }
    } else {
      await OfferAnalytics.findOneAndUpdate(
        baseFilter,
        { $inc: { [metricField]: count } },
        { upsert: true, new: true }
      );
    }
  } catch (error) {
    console.error(`Failed to track offer metric [${metricField}]:`, error.message);
  }
};

/**
 * Helper to execute full tracking across Merchant, Shop, and Offer Analytics simultaneously.
 * @param {Object} params
 * @param {String|ObjectId} params.merchantId
 * @param {String|ObjectId} [params.shopId=null]
 * @param {String|ObjectId} [params.offerId=null]
 * @param {String} params.metric - "view" | "click" | "redeem" | "claim" | "footfall"
 * @param {Object|String|null} [params.userData=null]
 */
export const trackFullAnalytics = async ({
  merchantId,
  shopId = null,
  offerId = null,
  metric,
  userData = null,
}) => {
  try {
    const promises = [];

    // Map metric shorthand to field names
    const dailyMetricMap = {
      view: "totalViewers",
      click: "offerClicks",
      redeem: "redeems",
      footfall: "footfall",
    };

    const offerMetricMap = {
      click: "clicks",
      redeem: "redeems",
      claim: "claims",
      footfall: "footfall",
    };

    // 1. Track Merchant level
    if (dailyMetricMap[metric]) {
      promises.push(trackDailyMetric2(merchantId, dailyMetricMap[metric], userData));
    }

    // 2. Track Shop level if shopId exists
    if (shopId && dailyMetricMap[metric]) {
      promises.push(trackDailyMetric(shopId, merchantId, dailyMetricMap[metric], userData));
    }

    // 3. Track Offer level if offerId exists
    if (offerId && offerMetricMap[metric]) {
      promises.push(trackOfferMetric(offerId, merchantId, offerMetricMap[metric], userData));
    }

    await Promise.all(promises);
  } catch (error) {
    console.error("Failed to execute full analytics tracking:", error.message);
  }
};
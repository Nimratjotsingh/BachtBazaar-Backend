import MerchantDailyAnalytics from "../models/MerchantDailyAnalytics.js";
import OfferAnalytics from "../models/offerDailyAnalytics.js";

/**
 * Tracks shop-specific daily metrics (Shop-level) with user logging & deduplication.
 * @param {String|ObjectId} shopId 
 * @param {String|ObjectId} merchantId 
 * @param {String} metricField - "totalViewers" | "offerClicks" | "redeems" | "footfall"
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

    const updateQuery = {};

    if (userId) {
      if (metricField === "totalViewers") {
        updateQuery.$addToSet = {
          viewerUsers: { userId, viewedAt: new Date() },
        };
        updateQuery.$inc = { totalViewers: count };
      } else if (metricField === "offerClicks") {
        updateQuery.$addToSet = {
          clickedUsers: { userId, offerId, clickedAt: new Date() },
        };
        updateQuery.$inc = { offerClicks: count };
      } else if (metricField === "redeems") {
        updateQuery.$push = {
          redeemedUsers: { userId, offerId, redemptionCode, redeemedAt: new Date() },
        };
        updateQuery.$inc = { redeems: count };
      } else if (metricField === "footfall") {
        updateQuery.$push = {
          footfallUsers: { userId, offerId, redemptionCode, visitedAt: new Date() },
        };
        updateQuery.$inc = { footfall: count };
      }
    } else {
      updateQuery.$inc = { [metricField]: count };
    }

    await MerchantDailyAnalytics.findOneAndUpdate(
      { merchantId, shopId, date: today },
      updateQuery,
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error(`Failed to track shop daily metric [${metricField}]:`, error.message);
  }
};

/**
 * Tracks merchant-level daily metrics (where shopId is null) with user logging & deduplication.
 * @param {String|ObjectId} merchantId 
 * @param {String} metricField - "totalViewers" | "offerClicks" | "redeems" | "footfall"
 * @param {Object|String|null} [userData=null] - { userId, offerId, redemptionCode } or userId string
 * @param {Number} [count=1] - Amount to increment
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

    const updateQuery = {};

    if (userId) {
      if (metricField === "totalViewers") {
        updateQuery.$addToSet = {
          viewerUsers: { userId, viewedAt: new Date() },
        };
        updateQuery.$inc = { totalViewers: count };
      } else if (metricField === "offerClicks") {
        updateQuery.$addToSet = {
          clickedUsers: { userId, offerId, clickedAt: new Date() },
        };
        updateQuery.$inc = { offerClicks: count };
      } else if (metricField === "redeems") {
        updateQuery.$push = {
          redeemedUsers: { userId, offerId, redemptionCode, redeemedAt: new Date() },
        };
        updateQuery.$inc = { redeems: count };
      } else if (metricField === "footfall") {
        updateQuery.$push = {
          footfallUsers: { userId, offerId, redemptionCode, visitedAt: new Date() },
        };
        updateQuery.$inc = { footfall: count };
      }
    } else {
      updateQuery.$inc = { [metricField]: count };
    }

    await MerchantDailyAnalytics.findOneAndUpdate(
      { merchantId, shopId: null, date: today },
      updateQuery,
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error(`Failed to track merchant daily metric [${metricField}]:`, error.message);
  }
};

/**
 * Updates general offer metrics and logs user arrays (clicks, redeems, claims, footfall).
 * @param {String|ObjectId} offerId 
 * @param {String|ObjectId} merchantId 
 * @param {String} metricField - "clicks" | "redeems" | "claims" | "footfall"
 * @param {Object|String|null} [userData=null] - { userId, redemptionCode } or userId string
 * @param {Number} [count=1] - Amount to increment
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

    const updateQuery = {};

    if (userId) {
      if (metricField === "clicks") {
        // Use $addToSet on user clicks to prevent duplicate clicks by the same user
        updateQuery.$addToSet = {
          clickedUsers: { userId, clickedAt: new Date() },
        };
        updateQuery.$inc = { clicks: count };
      } else if (metricField === "redeems") {
        updateQuery.$push = {
          redeemedUsers: { userId, redemptionCode, redeemedAt: new Date() },
        };
        updateQuery.$inc = { redeems: count };
      } else if (metricField === "claims") {
        updateQuery.$push = {
          claimedUsers: { userId, redemptionCode, claimedAt: new Date() },
        };
        updateQuery.$inc = { claims: count };
      } else if (metricField === "footfall") {
        updateQuery.$push = {
          footfallUsers: { userId, redemptionCode, visitedAt: new Date() },
        };
        updateQuery.$inc = { footfall: count };
      }
    } else {
      updateQuery.$inc = { [metricField]: count };
    }

    await OfferAnalytics.findOneAndUpdate(
      { offerId, merchantId },
      updateQuery,
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error(`Failed to track offer metric [${metricField}]:`, error.message);
  }
};
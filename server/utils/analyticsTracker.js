import MerchantDailyAnalytics from "../models/MerchantDailyAnalytics.js";
import OfferAnalytics from "../models/offerDailyAnalytics.js";
import mongoose from "mongoose";

/**
 * Tracks shop-specific daily metrics (Shop-level) with strict user-level deduplication.
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
      if (metricField === "totalViewers") {
        // Unique per user per day: Only increment if userId not already in viewerUsers
        const updateResult = await MerchantDailyAnalytics.updateOne(
          { ...baseFilter, "viewerUsers.userId": { $ne: userId } },
          {
            $push: { viewerUsers: { userId, viewedAt: new Date() } },$inc: { totalViewers: count },
          },
          { upsert: false }
        );

        if (updateResult.matchedCount === 0) {
          await MerchantDailyAnalytics.findOneAndUpdate(
            baseFilter,
            {
              $setOnInsert: { date: today, merchantId, shopId },
              $addToSet: { viewerUsers: { userId, viewedAt: new Date() } },$inc: { totalViewers: count },
            },
            { upsert: true, new: true }
          );
        }
      } else if (metricField === "offerClicks") {
        // Strict deduplication: Check if this exact user already clicked this specific offer today
        const condition = offerId
          ? { clickedUsers: { $not: { $elemMatch: { userId, offerId } } } }
          : { "clickedUsers.userId": { $ne: userId } };

        const updateResult = await MerchantDailyAnalytics.updateOne(
          { ...baseFilter, ...condition },
          {
            $push: { clickedUsers: { userId, offerId, clickedAt: new Date() } },$inc: { offerClicks: count },
          },
          { upsert: false }
        );

        if (updateResult.matchedCount === 0) {
          // Check if document exists; if not, upsert it. If it exists and user already clicked, do nothing.
          const docExists = await MerchantDailyAnalytics.findOne(baseFilter);
          if (!docExists) {
            await MerchantDailyAnalytics.findOneAndUpdate(
              baseFilter,
              {
                $setOnInsert: { date: today, merchantId, shopId },
                $addToSet: { clickedUsers: { userId, offerId, clickedAt: new Date() } },$inc: { offerClicks: count },
              },
              { upsert: true, new: true }
            );
          }
        }
      } else if (metricField === "redeem_and_footfall") {
        const now = new Date();
        await MerchantDailyAnalytics.findOneAndUpdate(
          baseFilter,
          {
            $push: { redeemedUsers: { userId, offerId, redemptionCode, redeemedAt: now }, footfallUsers: { userId, offerId, redemptionCode, visitedAt: now } },$inc: { redeems: count, footfall: count },
          },
          { upsert: true, new: true }
        );
      } else if (metricField === "redeems") {
        await MerchantDailyAnalytics.findOneAndUpdate(
          baseFilter,
          {
            $push: { redeemedUsers: { userId, offerId, redemptionCode, redeemedAt: new Date() } },$inc: { redeems: count },
          },
          { upsert: true, new: true }
        );
      } else if (metricField === "footfall") {
        await MerchantDailyAnalytics.findOneAndUpdate(
          baseFilter,
          {
            $push: { footfallUsers: { userId, offerId, redemptionCode, visitedAt: new Date() } },$inc: { footfall: count },
          },
          { upsert: true, new: true }
        );
      }
    } else {
      // Anonymous / non-user-specific increments
      if (metricField === "redeem_and_footfall") {
        await MerchantDailyAnalytics.findOneAndUpdate(
          baseFilter,
          { $inc: { redeems: count, footfall: count } },
          { upsert: true, new: true }
        );
      } else {
        const dbField = metricField === "bannerViews" ? "totalViewers" : metricField;
        await MerchantDailyAnalytics.findOneAndUpdate(
          baseFilter,
          { $inc: { [dbField]: count } },
          { upsert: true, new: true }
        );
      }
    }
  } catch (error) {
    console.error(`Failed to track shop daily metric [${metricField}]:`, error.message);
  }
};

/**
 * Tracks merchant-level daily metrics (shopId: null) with strict user-level deduplication.
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

    const rawUserId = typeof userData === "object" ? userData?.userId : userData;
    const rawOfferId = typeof userData === "object" ? userData?.offerId : null;
    const redemptionCode = typeof userData === "object" ? userData?.redemptionCode || "" : "";

    const userId = rawUserId ? new mongoose.Types.ObjectId(rawUserId.toString()) : null;
    const offerId = rawOfferId ? new mongoose.Types.ObjectId(rawOfferId.toString()) : null;
    const baseFilter = { merchantId, shopId: null, date: today };

    if (userId) {
      if (metricField === "totalViewers" || metricField === "bannerViews") {
        await MerchantDailyAnalytics.updateOne(
          baseFilter,
          { $setOnInsert: { date: today, merchantId, shopId: null, totalViewers: 0 } },
          { upsert: true }
        );

        await MerchantDailyAnalytics.updateOne(
          { ...baseFilter, "viewerUsers.userId": { $ne: userId } },
          {
            $push: { viewerUsers: { userId, viewedAt: new Date() } },$inc: { totalViewers: count },
          }
        );
      } else if (metricField === "offerClicks") {
        await MerchantDailyAnalytics.updateOne(
          baseFilter,
          { $setOnInsert: { date: today, merchantId, shopId: null, offerClicks: 0 } },
          { upsert: true }
        );

        const condition = offerId
          ? { clickedUsers: { $not: { $elemMatch: { userId, offerId } } } }
          : { "clickedUsers.userId": { $ne: userId } };

        await MerchantDailyAnalytics.updateOne(
          { ...baseFilter, ...condition },
          {
            $push: { clickedUsers: { userId, offerId, clickedAt: new Date() } },$inc: { offerClicks: count },
          }
        );
      } else if (metricField === "redeem_and_footfall") {
        const now = new Date();
        await MerchantDailyAnalytics.findOneAndUpdate(
          baseFilter,
          {
            $push: { redeemedUsers: { userId, offerId, redemptionCode, redeemedAt: now }, footfallUsers: { userId, offerId, redemptionCode, visitedAt: now } },$inc: { redeems: count, footfall: count },
          },
          { upsert: true, new: true }
        );
      } else if (metricField === "redeems") {
        await MerchantDailyAnalytics.findOneAndUpdate(
          baseFilter,
          {
            $push: { redeemedUsers: { userId, offerId, redemptionCode, redeemedAt: new Date() } },$inc: { redeems: count },
          },
          { upsert: true, new: true }
        );
      } else if (metricField === "footfall") {
        await MerchantDailyAnalytics.findOneAndUpdate(
          baseFilter,
          {
            $push: { footfallUsers: { userId, offerId, redemptionCode, visitedAt: new Date() } },$inc: { footfall: count },
          },
          { upsert: true, new: true }
        );
      }
    } else {
      if (metricField === "redeem_and_footfall") {
        await MerchantDailyAnalytics.findOneAndUpdate(
          baseFilter,
          { $inc: { redeems: count, footfall: count } },
          { upsert: true, new: true }
        );
      } else {
        const dbField = metricField === "bannerViews" ? "totalViewers" : metricField;
        await MerchantDailyAnalytics.findOneAndUpdate(
          baseFilter,
          { $inc: { [dbField]: count } },
          { upsert: true, new: true }
        );
      }
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
        // Strict deduplication: Only increment and push if userId is not already in clickedUsers array
        const res = await OfferAnalytics.updateOne(
          { ...baseFilter, "clickedUsers.userId": { $ne: userId } },
          {
            $push: { clickedUsers: { userId, clickedAt: new Date() } },$inc: { clicks: count },
          },
          { upsert: false }
        );

        if (res.matchedCount === 0) {
          const docExists = await OfferAnalytics.findOne(baseFilter);
          if (!docExists) {
            await OfferAnalytics.findOneAndUpdate(
              baseFilter,
              {
                $setOnInsert: { offerId, merchantId },
                $addToSet: { clickedUsers: { userId, clickedAt: new Date() } },$inc: { clicks: count },
              },
              { upsert: true, new: true }
            );
          }
        }
      } else if (metricField === "redeem_and_footfall") {
        const now = new Date();
        await OfferAnalytics.findOneAndUpdate(
          baseFilter,
          {
            $push: { redeemedUsers: { userId, redemptionCode, redeemedAt: now }, footfallUsers: { userId, redemptionCode, visitedAt: now } },$inc: { redeems: count, footfall: count },
          },
          { upsert: true, new: true }
        );
      } else if (metricField === "redeems") {
        await OfferAnalytics.findOneAndUpdate(
          baseFilter,
          {
            $push: { redeemedUsers: { userId, redemptionCode, redeemedAt: new Date() } },$inc: { redeems: count },
          },
          { upsert: true, new: true }
        );
      } else if (metricField === "claims") {
        await OfferAnalytics.findOneAndUpdate(
          baseFilter,
          {
            $push: { claimedUsers: { userId, redemptionCode, claimedAt: new Date() } },$inc: { claims: count },
          },
          { upsert: true, new: true }
        );
      } else if (metricField === "footfall") {
        await OfferAnalytics.findOneAndUpdate(
          baseFilter,
          {
            $push: { footfallUsers: { userId, redemptionCode, visitedAt: new Date() } },$inc: { footfall: count },
          },
          { upsert: true, new: true }
        );
      }
    } else {
      if (metricField === "redeem_and_footfall") {
        await OfferAnalytics.findOneAndUpdate(
          baseFilter,
          { $inc: { redeems: count, footfall: count } },
          { upsert: true, new: true }
        );
      } else {
        await OfferAnalytics.findOneAndUpdate(
          baseFilter,
          { $inc: { [metricField]: count } },
          { upsert: true, new: true }
        );
      }
    }
  } catch (error) {
    console.error(`Failed to track offer metric [${metricField}]:`, error.message);
  }
};

/**
 * Unified tracking helper executing across Merchant, Shop, and Offer Analytics.
 */
export const trackFullAnalytics = async ({
  merchantId,
  shopId = null,
  offerId = null,
  metric,
  userData = null,
  count = 1,
}) => {
  try {
    const promises = [];

    const dailyMetricMap = {
      view: "totalViewers",
      store_click: "totalViewers",
      click: "offerClicks",
      offer_click: "offerClicks",
      redeem: "redeem_and_footfall",
      offer_redeem: "redeem_and_footfall",
      footfall: "footfall",
    };

    const offerMetricMap = {
      click: "clicks",
      offer_click: "clicks",
      redeem: "redeem_and_footfall",
      offer_redeem: "redeem_and_footfall",
      claim: "claims",
      footfall: "footfall",
    };

    const dailyMetric = dailyMetricMap[metric];
    const offerMetric = offerMetricMap[metric];

    if (dailyMetric) {
      promises.push(trackDailyMetric2(merchantId, dailyMetric, userData, count));
    }

    if (shopId && dailyMetric) {
      promises.push(trackDailyMetric(shopId, merchantId, dailyMetric, userData, count));
    }

    if (offerId && offerMetric) {
      promises.push(trackOfferMetric(offerId, merchantId, offerMetric, userData, count));
    }

    await Promise.all(promises);
  } catch (error) {
    console.error("Failed to execute full analytics tracking:", error.message);
  }
};
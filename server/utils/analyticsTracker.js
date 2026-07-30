import MerchantDailyAnalytics from "../models/MerchantDailyAnalytics.js";


/**
 * Tracks shop-specific daily metrics (Shop-level)
 */
export const trackDailyMetric = async (shopId, merchantId, metricField, count = 1) => {
  try {
    if (!shopId || !merchantId || !metricField) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await MerchantDailyAnalytics.findOneAndUpdate(
      { merchantId, shopId, date: today },
      {
        $inc: { [metricField]: count },
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error(`Failed to track shop daily metric [${metricField}]:`, error.message);
  }
};

/**
 * Tracks merchant-level daily metrics (where shopId is not applicable)
 */
export const trackDailyMetric2 = async (merchantId, metricField, count = 1) => {
  try {
    if (!merchantId || !metricField) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await MerchantDailyAnalytics.findOneAndUpdate(
      { merchantId, shopId: null, date: today },
      {
        $inc: { [metricField]: count },
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error(`Failed to track merchant daily metric [${metricField}]:`, error.message);
  }
};

import OfferAnalytics from "../models/offerDailyAnalytics.js";

/**
 * Updates general metrics and records claimed users for an offer.
 * @param {String|ObjectId} offerId 
 * @param {String|ObjectId} merchantId 
 * @param {String} metricField - "clicks" | "redeems" | "claims" | "footfall"
 * @param {Object} [claimUserData] - Optional: { userId, redemptionCode }
 * @param {Number} count - Amount to increment (default 1)
 */
export const trackOfferMetric = async (
  offerId,
  merchantId,
  metricField,
  claimUserData = null,
  count = 1
) => {
  try {
    if (!offerId || !merchantId || !metricField) return;

    const updateQuery = {
      $inc: { [metricField]: count },
    };

    // Push user info into the list if provided during a claim event
    if (claimUserData && claimUserData.userId) {
      updateQuery.$push = {
        claimedUsers: {
          userId: claimUserData.userId,
          redemptionCode: claimUserData.redemptionCode || "",
          claimedAt: new Date(),
        },
      };
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
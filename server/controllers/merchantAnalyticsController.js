import MerchantDailyAnalytics from "../models/MerchantDailyAnalytics.js";
import Offer from "../models/offerModel.js";
import OfferAnalytics from "../models/offerDailyAnalytics.js";

/**
 * GET /api/merchant/analytics/dashboard
 * Query Params: ?days=7 (or 30, 1), ?shopId=... (optional)
 * Aggregates daily metrics and populates unique user activities with boolean flags.
 */
export const getMerchantDailyAnalytics = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { days = 7, shopId } = req.query;

    // 1. Calculate target start date (00:00:00 UTC/Local)
    const timeframeDays = Math.max(1, Number(days));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (timeframeDays - 1));
    startDate.setHours(0, 0, 0, 0);

    // 2. Build query block
    const query = {
      merchantId,
      date: { $gte: startDate }
    };

    if (shopId) {
      query.shopId = shopId;
    }

    // 3. Query daily records and populate user details across all action arrays
    const analyticsLogs = await MerchantDailyAnalytics.find(query)
      .populate("viewerUsers.userId", "name email phone profileImage")
      .populate("clickedUsers.userId", "name email phone profileImage")
      .populate("redeemedUsers.userId", "name email phone profileImage")
      .populate("footfallUsers.userId", "name email phone profileImage")
      .sort({ date: 1 })
      .lean();

    // 4. Compute aggregated totals
    const summaryTotals = analyticsLogs.reduce(
      (acc, log) => {
        acc.totalViewers += log.totalViewers || 0;
        acc.offerClicks += log.offerClicks || 0;
        acc.redeems += log.redeems || 0;
        acc.footfall += log.footfall || 0;
        return acc;
      },
      { totalViewers: 0, offerClicks: 0, redeems: 0, footfall: 0 }
    );

    // 5. Consolidate logs into day-by-day aggregated user activity profiles
    const formattedLogs = analyticsLogs.map((log) => {
      const userMap = new Map();

      // Helper function to consolidate user records per day
      const processUserArray = (array, flagName, timeField) => {
        (array || []).forEach((item) => {
          if (!item.userId || !item.userId._id) return;
          const uid = item.userId._id.toString();

          if (!userMap.has(uid)) {
            userMap.set(uid, {
              user: item.userId,
              hasViewed: false,
              hasClicked: false,
              hasRedeemed: false,
              hasVisitedFootfall: false,
              viewedAt: null,
              clickedAt: null,
              redeemedAt: null,
              visitedAt: null,
              redemptionCode: item.redemptionCode || ""
            });
          }

          const record = userMap.get(uid);
          record[flagName] = true;
          if (timeField && item[timeField]) {
            record[timeField] = item[timeField];
          }
          if (item.redemptionCode) {
            record.redemptionCode = item.redemptionCode;
          }
        });
      };

      processUserArray(log.viewerUsers, "hasViewed", "viewedAt");
      processUserArray(log.clickedUsers, "hasClicked", "clickedAt");
      processUserArray(log.redeemedUsers, "hasRedeemed", "redeemedAt");
      processUserArray(log.footfallUsers, "hasVisitedFootfall", "visitedAt");

      return {
        _id: log._id,
        merchantId: log.merchantId,
        shopId: log.shopId,
        date: log.date,
        totalViewers: log.totalViewers,
        offerClicks: log.offerClicks,
        redeems: log.redeems,
        footfall: log.footfall,
        userActivity: Array.from(userMap.values())
      };
    });

    // Calculate Conversion Rates
    const clickToRedeemRate = summaryTotals.offerClicks > 0
      ? ((summaryTotals.redeems / summaryTotals.offerClicks) * 100).toFixed(1) + "%"
      : "0%";

    const redeemToClaimFootfallRate = summaryTotals.redeems > 0
      ? ((summaryTotals.footfall / summaryTotals.redeems) * 100).toFixed(1) + "%"
      : "0%";

    return res.status(200).json({
      success: true,
      timeframeDays,
      summary: {
        ...summaryTotals,
        conversionRates: {
          clickToRedeem: clickToRedeemRate,
          redeemToClaimFootfall: redeemToClaimFootfallRate
        }
      },
      dailyBreakdown: formattedLogs
    });

  } catch (error) {
    console.error("Get Merchant Daily Analytics Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve daily analytics records.",
      error: error.message
    });
  }
};

/**
 * GET /api/merchant/analytics/offers-breakdown
 */
export const getMerchantOffersAnalyticsBreakdown = async (req, res) => {
  try {
    const merchantId = req.merchant._id;

    const offers = await Offer.find({ merchant_id: merchantId, is_deleted: false })
      .select("title claim_limit redeemedCount claimedCount start_date end_date is_active createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const offerPerformance = offers.map((offer) => {
      const redeemed = offer.redeemedCount || 0;
      const claimed = offer.claimedCount || 0;
      const limit = offer.claim_limit !== undefined && offer.claim_limit !== null ? offer.claim_limit : "Unlimited";

      return {
        offerId: offer._id,
        title: offer.title,
        claimLimit: limit,
        redeemedCount: redeemed,
        claimedFootfallCount: claimed,
        pendingClaims: Math.max(0, redeemed - claimed),
        conversionRate: redeemed > 0 ? ((claimed / redeemed) * 100).toFixed(1) + "%" : "0%",
        isActive: offer.is_active,
        startDate: offer.start_date,
        endDate: offer.end_date
      };
    });

    return res.status(200).json({
      success: true,
      totalOffers: offers.length,
      data: offerPerformance
    });

  } catch (error) {
    console.error("Get Offers Analytics Breakdown Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve offer performance breakdown.",
      error: error.message
    });
  }
};

/**
 * GET /api/merchant/analytics/offers/:offerId
 * Returns total clicks, redeems, claims, footfall, and a unified list of unique users with status flags.
 */
export const getOfferAnalytics = async (req, res) => {
  try {
    const { offerId } = req.params;
    const merchantId = req.merchant._id;

    // 1. Verify offer existence and ownership
    const offer = await Offer.findOne({ _id: offerId, merchant_id: merchantId, is_deleted: false });
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found or access denied.",
      });
    }

    // 2. Query analytics and populate all user reference arrays
    const analytics = await OfferAnalytics.findOne({ offerId, merchantId })
      .populate("clickedUsers.userId", "name email phone profileImage")
      .populate("redeemedUsers.userId", "name email phone profileImage")
      .populate("claimedUsers.userId", "name email phone profileImage")
      .populate("footfallUsers.userId", "name email phone profileImage")
      .lean();

    // Fallback if no analytics record exists yet
    const data = analytics || {
      clicks: 0,
      redeems: 0,
      claims: 0,
      footfall: 0,
      clickedUsers: [],
      redeemedUsers: [],
      claimedUsers: [],
      footfallUsers: []
    };

    // 3. Consolidate user arrays into a single Map keyed by userId
    const userMap = new Map();

    const processArray = (array, flagName, timeField) => {
      (array || []).forEach((item) => {
        if (!item.userId || !item.userId._id) return;
        const uid = item.userId._id.toString();

        if (!userMap.has(uid)) {
          userMap.set(uid, {
            user: item.userId,
            hasClicked: false,
            hasRedeemed: false,
            hasClaimed: false,
            hasVisitedFootfall: false,
            clickedAt: null,
            redeemedAt: null,
            claimedAt: null,
            visitedAt: null,
            redemptionCode: item.redemptionCode || ""
          });
        }

        const record = userMap.get(uid);
        record[flagName] = true;
        if (timeField && item[timeField]) {
          record[timeField] = item[timeField];
        }
        if (item.redemptionCode) {
          record.redemptionCode = item.redemptionCode;
        }
      });
    };

    processArray(data.clickedUsers, "hasClicked", "clickedAt");
    processArray(data.redeemedUsers, "hasRedeemed", "redeemedAt");
    processArray(data.claimedUsers, "hasClaimed", "claimedAt");
    processArray(data.footfallUsers, "hasVisitedFootfall", "visitedAt");

    // Convert Map to clean Array
    const unifiedUserActivity = Array.from(userMap.values());

    // Calculate Conversion Rates
    const clickToRedeemRate = data.clicks > 0
      ? ((data.redeems / data.clicks) * 100).toFixed(1) + "%"
      : "0%";

    const redeemToClaimRate = data.redeems > 0
      ? ((data.claims / data.redeems) * 100).toFixed(1) + "%"
      : "0%";

    return res.status(200).json({
      success: true,
      offerDetails: {
        _id: offer._id,
        title: offer.title,
        claimLimit: offer.claim_limit || "Unlimited",
        isActive: offer.is_active,
      },
      summary: {
        totalClicks: data.clicks,
        totalRedeems: data.redeems,
        totalClaims: data.claims,
        totalFootfall: data.footfall,
        uniqueUsersCount: unifiedUserActivity.length,
        clickToRedeemRate,
        redeemToClaimRate,
      },
      userActivity: unifiedUserActivity,
    });

  } catch (error) {
    console.error("Get Offer Analytics Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve offer analytics.",
      error: error.message,
    });
  }
};
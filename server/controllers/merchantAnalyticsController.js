import MerchantDailyAnalytics from "../models/MerchantDailyAnalytics.js";
import Offer from "../models/offerModel.js";
import OfferAnalytics from "../models/offerDailyAnalytics.js";
import OfferRedemption from "../models/offerRedemptionModel.js";

/**
 * Helper / Endpoint: Aggregates advanced stats for merchant summary
 * Returns banner views, repeat customers, customer visits, new customers,
 * highest redemption day, and top claimed offer for a given timeframe.
 */
export const getMerchantStatsOverview = async (merchantId, startDate = null) => {
  try {
    const cycleStartDate = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0, 0);

    // 1. BANNER VIEWS (Sum of totalViewers from MerchantDailyAnalytics within timeframe)
    const bannerViewsResult = await MerchantDailyAnalytics.aggregate([
      { $match: { merchantId, date: { $gte: cycleStartDate } } },
      { $group: { _id: null, totalViews: { $sum: "$totalViewers" } } },
    ]);
    const bannerViewsCount = bannerViewsResult[0]?.totalViews || 0;

    // 2. NEW CUSTOMERS vs REPEAT CUSTOMERS
    const customerRedemptions = await MerchantDailyAnalytics.aggregate([
      { $match: { merchantId, date: { $gte: cycleStartDate } } },
      { $unwind: "$redeemedUsers" },
      {
        $group: {
          _id: "$redeemedUsers.userId",
          redemptionCount: { $sum: 1 },
        },
      },
    ]);

    let newCustomersCount = 0;
    let repeatCustomersCount = 0;

    customerRedemptions.forEach((user) => {
      if (user.redemptionCount === 1) newCustomersCount++;
      else if (user.redemptionCount > 1) repeatCustomersCount++;
    });

    // 3. CUSTOMER VISITS (Unique visitors across viewerUsers and footfallUsers)
    const customerVisitsResult = await MerchantDailyAnalytics.aggregate([
      { $match: { merchantId, date: { $gte: cycleStartDate } } },
      {
        $project: {
          allUsers: {
            $concatArrays: [
              { $ifNull: ["$viewerUsers.userId", []] },
              { $ifNull: ["$footfallUsers.userId", []] },
            ],
          },
        },
      },
      { $unwind: "$allUsers" },
      { $group: { _id: "$allUsers" } },
      { $count: "totalUniqueVisitors" },
    ]);
    const customerVisitsCount = customerVisitsResult[0]?.totalUniqueVisitors || 0;

    // 4. HIGHEST OFFER REDEMPTION DAY
    const highestRedemptionDayResult = await MerchantDailyAnalytics.aggregate([
      { $match: { merchantId, date: { $gte: cycleStartDate } } },
      {
        $project: {
          date: 1,
          totalRedeems: { $size: { $ifNull: ["$redeemedUsers", []] } },
        },
      },
      { $sort: { totalRedeems: -1 } },
      { $limit: 1 },
    ]);

    const highestRedemptionDay = highestRedemptionDayResult[0]
      ? {
          date: highestRedemptionDayResult[0].date,
          count: highestRedemptionDayResult[0].totalRedeems,
        }
      : { date: null, count: 0 };

    // 5. BEST OFFER / HIGHEST CLAIMED OFFER (From OfferAnalytics)
    const topClaimedOfferResult = await OfferAnalytics.aggregate([
      { $match: { merchantId } },
      {
        $project: {
          offerId: 1,
          totalClaims: { $size: { $ifNull: ["$claimedUsers", []] } },
          totalRedeems: { $size: { $ifNull: ["$redeemedUsers", []] } },
        },
      },
      { $sort: { totalClaims: -1, totalRedeems: -1 } },
      { $limit: 1 },
    ]);

    let highestClaimedOffer = null;
    if (topClaimedOfferResult.length > 0) {
      const topOfferDoc = await Offer.findById(topClaimedOfferResult[0].offerId)
        .select("title thumbnail display_type")
        .lean();

      if (topOfferDoc) {
        highestClaimedOffer = {
          offerId: topOfferDoc._id,
          title: topOfferDoc.title,
          displayType: topOfferDoc.display_type,
          claimsCount: topClaimedOfferResult[0].totalClaims,
          redeemsCount: topClaimedOfferResult[0].totalRedeems,
        };
      }
    }

    return {
      BANNER_VIEWS: bannerViewsCount,
      CUSTOMER_VISITS: customerVisitsCount,
      NEW_CUSTOMERS: newCustomersCount,
      REPEAT_CUSTOMERS: repeatCustomersCount,
      HIGHEST_REDEMPTION_DAY: highestRedemptionDay,
      HIGHEST_CLAIMED_OFFER: highestClaimedOffer,
    };
  } catch (error) {
    console.error("Get Merchant Stats Overview Error:", error);
    return {
      BANNER_VIEWS: 0,
      CUSTOMER_VISITS: 0,
      NEW_CUSTOMERS: 0,
      REPEAT_CUSTOMERS: 0,
      HIGHEST_REDEMPTION_DAY: { date: null, count: 0 },
      HIGHEST_CLAIMED_OFFER: null,
    };
  }
};

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

    // Get calculated merchant stats overview
    const merchantStatsOverview = await getMerchantStatsOverview(merchantId, startDate);

    return res.status(200).json({
      success: true,
      timeframeDays,
      summary: {
        ...summaryTotals,
        conversionRates: {
          clickToRedeem: clickToRedeemRate,
          redeemToClaimFootfall: redeemToClaimFootfallRate
        },
        merchantStatsOverview,
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

const getTimeframeBounds = (days = 7, startDateParam = null, endDateParam = null) => {
  const end = endDateParam ? new Date(endDateParam) : new Date();
  let start;

  if (startDateParam) {
    start = new Date(startDateParam);
  } else {
    const timeframeDays = Math.max(1, Number(days));
    start = new Date();
    start.setDate(start.getDate() - (timeframeDays - 1));
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

/**
 * GET /api/merchant/analytics/top-offers
 * Query Params: ?days=7 (or 30, 90) | ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD | ?limit=5
 * Returns the highest claimed and redeemed offers in a given time frame.
 */
export const getTopPerformingOffers = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { days = 7, startDate, endDate, limit = 5 } = req.query;

    const { start, end } = getTimeframeBounds(days, startDate, endDate);
    const resultLimit = Math.max(1, Number(limit));

    // 1. Aggregate Top Claimed & Redeemed Offers from OfferRedemption collection
    const redemptionAggregation = await OfferRedemption.aggregate([
      {
        $match: {
          merchantId,
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: "$offerId",
          claimsCount: { $sum: 1 },
          redemptionsCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "redeemed"] }, 1, 0],
            },
          },
        },
      },
      { $sort: { claimsCount: -1, redemptionsCount: -1 } },
      { $limit: resultLimit },
    ]);

    // 2. Fallback to OfferAnalytics if OfferRedemption has no matching records
    let topOfferStats = redemptionAggregation;

    if (topOfferStats.length === 0) {
      topOfferStats = await OfferAnalytics.aggregate([
        { $match: { merchantId } },
        {
          $project: {
            _id: "$offerId",
            claimsCount: { $size: { $ifNull: ["$claimedUsers", []] } },
            redemptionsCount: { $size: { $ifNull: ["$redeemedUsers", []] } },
          },
        },
        { $sort: { claimsCount: -1, redemptionsCount: -1 } },
        { $limit: resultLimit },
      ]);
    }

    // 3. Populate Offer metadata
    const offerIds = topOfferStats.map((item) => item._id);
    const offerDocs = await Offer.find({ _id: { $in: offerIds }, is_deleted: false })
      .select("title display_type thumbnail discount_percentage discount_value claim_limit is_active")
      .lean();

    const offerMap = new Map(offerDocs.map((o) => [o._id.toString(), o]));

    const rankedOffers = topOfferStats
      .map((item) => {
        const offer = offerMap.get(item._id.toString());
        if (!offer) return null;

        const claims = item.claimsCount || 0;
        const redeems = item.redemptionsCount || 0;
        const conversionRate = claims > 0 ? ((redeems / claims) * 100).toFixed(1) + "%" : "0%";

        return {
          offerId: offer._id,
          title: offer.title,
          displayType: offer.display_type,
          thumbnail: offer.thumbnail,
          claimLimit: offer.claim_limit ?? "Unlimited",
          isActive: offer.is_active,
          metrics: {
            claimsCount: claims,
            redemptionsCount: redeems,
            conversionRate,
          },
        };
      })
      .filter(Boolean);

    // 4. Highlight the absolute #1 Offer
    const highestPerformanceOffer = rankedOffers.length > 0 ? rankedOffers[0] : null;

    return res.status(200).json({
      success: true,
      timeframe: {
        startDate: start,
        endDate: end,
      },
      summary: {
        totalTopOffersEvaluated: rankedOffers.length,
        highestClaimedOffer: highestPerformanceOffer,
      },
      topOffers: rankedOffers,
    });
  } catch (error) {
    console.error("Get Top Performing Offers Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve top-performing offers.",
      error: error.message,
    });
  }
};

/**
 * GET /api/merchant/analytics/highest-redemption-day
 * Query Params: ?days=30 | ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Returns the single date with the highest redemption volume in the requested timeframe.
 */
export const getHighestRedemptionDay = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { days = 30, startDate, endDate } = req.query;

    const { start, end } = getTimeframeBounds(days, startDate, endDate);

    const highestDayResult = await OfferRedemption.aggregate([
      {
        $match: {
          merchantId,
          status: "redeemed",
          updatedAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
          totalRedemptions: { $sum: 1 },
        },
      },
      { $sort: { totalRedemptions: -1 } },
      { $limit: 1 },
    ]);

    const highestDay = highestDayResult[0]
      ? { date: highestDayResult[0]._id, redemptionsCount: highestDayResult[0].totalRedemptions }
      : { date: null, redemptionsCount: 0 };

    return res.status(200).json({
      success: true,
      timeframe: { startDate: start, endDate: end },
      highestRedemptionDay: highestDay,
    });
  } catch (error) {
    console.error("Get Highest Redemption Day Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to calculate highest redemption day.",
      error: error.message,
    });
  }
};
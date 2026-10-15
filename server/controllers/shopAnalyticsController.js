import ShopClick from "../models/shopClickModel.js";

/**
 * Retrieves shop click analytics grouped by date for a specific merchant.
 */
export const getMerchantShopClickAnalytics = async (req, res) => {
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
      date: { $gte: startDate },
    };

    if (shopId) {
      query.shopId = shopId;
    }

    // 3. Query records and populate unique clicked user profiles
    const clickLogs = await ShopClick.find(query)
      .populate("shopId", "shopName city address")
      .populate("clickedUsers.userId", "name email phone profileImage")
      .sort({ date: 1 })
      .lean();

    // 4. Compute aggregated totals across all returned logs
    const totalClicks = clickLogs.reduce((acc, log) => acc + (log.totalClicks || 0), 0);

    // 5. Format daily logs for frontend consumption
    const formattedLogs = clickLogs.map((log) => ({
      _id: log._id,
      merchantId: log.merchantId,
      shop: log.shopId,
      date: log.date,
      totalClicks: log.totalClicks || 0,
      uniqueUsers: (log.clickedUsers || []).map((entry) => ({
        user: entry.userId,
        clickedAt: entry.clickedAt,
      })),
    }));

    return res.status(200).json({
      success: true,
      timeframeDays,
      summary: {
        totalClicks,
      },
      dailyBreakdown: formattedLogs,
    });
  } catch (error) {
    console.error("Get Merchant Shop Click Analytics Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve shop click analytics records.",
      error: error.message,
    });
  }
};

import OfferRedeem from "../models/offerRedeemModel.js";


export const getMerchantOfferRedeemAnalytics = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { days = 7, offerId } = req.query;

    // 1. Calculate target start date (00:00:00)
    const timeframeDays = Math.max(1, Number(days));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (timeframeDays - 1));
    startDate.setHours(0, 0, 0, 0);

    // 2. Build query block
    const query = {
      merchantId,
      date: { $gte: startDate },
    };

    if (offerId) {
      query.offerId = offerId;
    }

    // 3. Query records and populate details
    const redeemLogs = await OfferRedeem.find(query)
      .populate("offerId", "title description thumbnail discount_percentage")
      .populate("shopId", "shopName city")
      .populate("redeemedUsers.userId", "name email phone profileImage")
      .sort({ date: 1 })
      .lean();

    // 4. Compute aggregated totals across all returned logs
    const totalRedeems = redeemLogs.reduce((acc, log) => acc + (log.totalRedeems || 0), 0);

    // 5. Format daily logs for frontend consumption
    const formattedLogs = redeemLogs.map((log) => ({
      _id: log._id,
      merchantId: log.merchantId,
      offer: log.offerId,
      shop: log.shopId,
      date: log.date,
      totalRedeems: log.totalRedeems || 0,
      redeemedUsers: log.redeemedUsers || [],
    }));

    return res.status(200).json({
      success: true,
      timeframeDays,
      summary: {
        totalRedeems,
      },
      dailyBreakdown: formattedLogs,
    });
  } catch (error) {
    console.error("Get Merchant Offer Redeem Analytics Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve offer redemption analytics records.",
      error: error.message,
    });
  }
};

import OfferClick from "../models/offerClickModel.js";

export const getCombinedMerchantAnalytics = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { days = 7, shopId, offerId } = req.query;

    // 1. Calculate target start date (00:00:00)
    const timeframeDays = Math.max(1, Number(days));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (timeframeDays - 1));
    startDate.setHours(0, 0, 0, 0);

    // 2. Build individual query filters
    const shopQuery = { merchantId, date: { $gte: startDate } };
    if (shopId) shopQuery.shopId = shopId;

    const offerClickQuery = { merchantId, date: { $gte: startDate } };
    if (offerId) offerClickQuery.offerId = offerId;

    const offerRedeemQuery = { merchantId, date: { $gte: startDate } };
    if (offerId) offerRedeemQuery.offerId = offerId;

    // 3. Execute all three queries concurrently using Promise.all
    const [shopClickLogs, offerClickLogs, offerRedeemLogs] = await Promise.all([
      ShopClick.find(shopQuery)
        .populate("shopId", "shopName city address")
        .populate("clickedUsers.userId", "name email phone profileImage")
        .sort({ date: 1 })
        .lean(),
      
      OfferClick.find(offerClickQuery)
        .populate("offerId", "title description thumbnail discount_percentage")
        .populate("clickedUsers.userId", "name email phone profileImage")
        .sort({ date: 1 })
        .lean(),
      
      OfferRedeem.find(offerRedeemQuery)
        .populate("offerId", "title description thumbnail discount_percentage")
        .populate("redeemedUsers.userId", "name email phone profileImage")
        .sort({ date: 1 })
        .lean(),
    ]);

    // 4. Compute overall summary totals
    const totalShopClicks = shopClickLogs.reduce((acc, log) => acc + (log.totalClicks || 0), 0);
    const totalOfferClicks = offerClickLogs.reduce((acc, log) => acc + (log.totalClicks || 0), 0);
    const totalRedeems = offerRedeemLogs.reduce((acc, log) => acc + (log.totalRedeems || 0), 0);

    // 5. Calculate conversion rate (Clicks to Redeems)
    const clickToRedeemRate = totalOfferClicks > 0
      ? ((totalRedeems / totalOfferClicks) * 100).toFixed(1) + "%"
      : "0%";

    return res.status(200).json({
      success: true,
      timeframeDays,
      summary: {
        totalShopClicks,
        totalOfferClicks,
        totalRedeems,
        clickToRedeemRate,
      },
      breakdown: {
        shopClicks: shopClickLogs.map((log) => ({
          _id: log._id,
          date: log.date,
          shop: log.shopId,
          totalClicks: log.totalClicks || 0,
          uniqueUsers: log.clickedUsers || [],
        })),
        offerClicks: offerClickLogs.map((log) => ({
          _id: log._id,
          date: log.date,
          offer: log.offerId,
          totalClicks: log.totalClicks || 0,
          uniqueUsers: log.clickedUsers || [],
        })),
        offerRedeems: offerRedeemLogs.map((log) => ({
          _id: log._id,
          date: log.date,
          offer: log.offerId,
          totalRedeems: log.totalRedeems || 0,
          uniqueUsers: log.redeemedUsers || [],
        })),
      },
    });
  } catch (error) {
    console.error("Get Combined Merchant Analytics Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve combined analytics records.",
      error: error.message,
    });
  }
};
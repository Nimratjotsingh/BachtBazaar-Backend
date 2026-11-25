import { trackUniqueShopClick } from "../utils/shopClickTracker.js";
import MerchantShop from "../models/merchantShopModel.js";

export const recordShopClick = async (req, res) => {
  try {
    const { shopId } = req.params;
    console.log(req.params)
    const userId = req.user?._id;

    console.log(shopId)

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required to log click." });
    }

    const shop = await MerchantShop.findById(shopId).select("merchantId").lean();
    if (!shop) {
      return res.status(404).json({ success: false, message: "Shop not found." });
    }

    // Trigger unique daily tracking
    await trackUniqueShopClick(shop._id, shop.merchantId, userId);

    return res.status(200).json({
      success: true,
      message: "Shop click recorded successfully."
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

import { trackUniqueOfferClick } from "../utils/offerClickTracker.js";
import Offer from "../models/offerModel.js";
import ComboOffer from '../models/ComboOfferModel.js';
import mongoose from 'mongoose'

export const recordOfferClick = async (req, res) => {
  try {
    const { offerId } = req.params;
    const userId = req.user?._id;
    const requestedType = req.query.type || req.body?.type; // Optional hint: "Offer" or "ComboOffer"

    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to log click.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(offerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Offer or Combo ID format.",
      });
    }

    let targetMerchantId = null;
    let resolvedModel = "Offer";

    if (requestedType === "ComboOffer") {
      const combo = await ComboOffer.findById(offerId).select("merchantId").lean();
      if (!combo) {
        return res.status(404).json({ success: false, message: "Combo offer not found." });
      }
      targetMerchantId = combo.merchantId;
      resolvedModel = "ComboOffer";
    } else if (requestedType === "Offer") {
      const offer = await Offer.findById(offerId).select("merchant_id").lean();
      if (!offer) {
        return res.status(404).json({ success: false, message: "Offer not found." });
      }
      targetMerchantId = offer.merchant_id;
      resolvedModel = "Offer";
    } else {
      // Auto-resolve: Check Offer first, then fall back to ComboOffer
      const offer = await Offer.findById(offerId).select("merchant_id").lean();
      if (offer) {
        targetMerchantId = offer.merchant_id;
        resolvedModel = "Offer";
      } else {
        const combo = await ComboOffer.findById(offerId).select("merchantId").lean();
        if (!combo) {
          return res.status(404).json({
            success: false,
            message: "Offer or Combo Offer not found.",
          });
        }
        targetMerchantId = combo.merchantId;
        resolvedModel = "ComboOffer";
      }
    }

    // Trigger unique daily click tracking for the resolved model
    await trackUniqueOfferClick(offerId, targetMerchantId, userId, resolvedModel);

    return res.status(200).json({
      success: true,
      message: `${resolvedModel === "ComboOffer" ? "Combo offer" : "Offer"} click recorded successfully.`,
      offerModel: resolvedModel,
    });
  } catch (error) {
    console.error("Record Offer/Combo Click Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

import OfferRedeem from "../models/offerRedeemModel.js";

import { trackOfferRedemption } from "../utils/offerRedeemTracker.js";

/**
 * Records a successful offer redemption by a user at a merchant/shop.
 */
export const recordOfferRedemptionUserOnly = async (req, res) => {
  try {
    const { offerId, shopId, type } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to record redemption.",
      });
    }

    if (!offerId || !mongoose.Types.ObjectId.isValid(offerId)) {
      return res.status(400).json({
        success: false,
        message: "Missing or invalid required parameter (offerId).",
      });
    }

    let targetMerchantId = null;
    let resolvedShopId = shopId || null;
    let resolvedModel = "Offer";

    if (type === "ComboOffer") {
      const combo = await ComboOffer.findById(offerId)
        .select("merchantId shopId name offer_quantity sold_count")
        .lean();

      if (!combo) {
        return res.status(404).json({ success: false, message: "Combo offer not found." });
      }

      if (combo.offer_quantity !== null && combo.sold_count >= combo.offer_quantity) {
        return res.status(400).json({
          success: false,
          message: "This combo offer has reached its maximum redemption limit.",
        });
      }

      targetMerchantId = combo.merchantId;
      if (!resolvedShopId && combo.shopId) resolvedShopId = combo.shopId;
      resolvedModel = "ComboOffer";
    } else if (type === "Offer") {
      const offer = await Offer.findById(offerId).select("merchant_id title").lean();
      if (!offer) {
        return res.status(404).json({ success: false, message: "Offer not found." });
      }
      targetMerchantId = offer.merchant_id;
      resolvedModel = "Offer";
    } else {
      // Auto-resolve: Check Offer first, then fall back to ComboOffer
      const offer = await Offer.findById(offerId).select("merchant_id title").lean();
      if (offer) {
        targetMerchantId = offer.merchant_id;
        resolvedModel = "Offer";
      } else {
        const combo = await ComboOffer.findById(offerId)
          .select("merchantId shopId name offer_quantity sold_count")
          .lean();

        if (!combo) {
          return res.status(404).json({
            success: false,
            message: "Offer or Combo Offer not found.",
          });
        }

        if (combo.offer_quantity !== null && combo.sold_count >= combo.offer_quantity) {
          return res.status(400).json({
            success: false,
            message: "This combo offer has reached its maximum redemption limit.",
          });
        }

        targetMerchantId = combo.merchantId;
        if (!resolvedShopId && combo.shopId) resolvedShopId = combo.shopId;
        resolvedModel = "ComboOffer";
      }
    }

    // Trigger daily redemption tracking
    await trackOfferRedemption(
      offerId,
      targetMerchantId,
      userId,
      resolvedShopId,
      resolvedModel
    );

    // If it's a ComboOffer, also increment sold_count atomically
    if (resolvedModel === "ComboOffer") {
      await ComboOffer.updateOne({ _id: offerId }, { $inc: { sold_count: 1 } });
    }

    return res.status(200).json({
      success: true,
      message: `${resolvedModel === "ComboOffer" ? "Combo offer" : "Offer"} redemption successfully recorded.`,
      offerModel: resolvedModel,
    });
  } catch (error) {
    console.error("Record Offer/Combo Redemption Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const recordOfferRedemption = async (req, res) => {
  try {
    const { offerId, userId, shopId, redemptionCode, type } = req.body;
    const merchantId = req.merchant?._id; // Authenticated merchant or staff

    if (!offerId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing required redemption parameters (offerId, userId).",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(offerId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid offerId or userId format.",
      });
    }

    let targetMerchantId = merchantId || null;
    let resolvedShopId = shopId || null;
    let resolvedModel = "Offer";

    if (type === "ComboOffer") {
      const combo = await ComboOffer.findById(offerId)
        .select("merchantId shopId name offer_quantity sold_count")
        .lean();

      if (!combo) {
        return res.status(404).json({ success: false, message: "Combo offer not found." });
      }

      if (combo.offer_quantity !== null && combo.sold_count >= combo.offer_quantity) {
        return res.status(400).json({
          success: false,
          message: "This combo offer has reached its maximum redemption limit.",
        });
      }

      if (!targetMerchantId) targetMerchantId = combo.merchantId;
      if (!resolvedShopId && combo.shopId) resolvedShopId = combo.shopId;
      resolvedModel = "ComboOffer";
    } else if (type === "Offer") {
      const offer = await Offer.findById(offerId).select("merchant_id title").lean();
      if (!offer) {
        return res.status(404).json({ success: false, message: "Offer not found." });
      }
      if (!targetMerchantId) targetMerchantId = offer.merchant_id;
      resolvedModel = "Offer";
    } else {
      // Auto-resolve: Check Offer first, then fall back to ComboOffer
      const offer = await Offer.findById(offerId).select("merchant_id title").lean();
      if (offer) {
        if (!targetMerchantId) targetMerchantId = offer.merchant_id;
        resolvedModel = "Offer";
      } else {
        const combo = await ComboOffer.findById(offerId)
          .select("merchantId shopId name offer_quantity sold_count")
          .lean();

        if (!combo) {
          return res.status(404).json({
            success: false,
            message: "Offer or Combo Offer not found.",
          });
        }

        if (combo.offer_quantity !== null && combo.sold_count >= combo.offer_quantity) {
          return res.status(400).json({
            success: false,
            message: "This combo offer has reached its maximum redemption limit.",
          });
        }

        if (!targetMerchantId) targetMerchantId = combo.merchantId;
        if (!resolvedShopId && combo.shopId) resolvedShopId = combo.shopId;
        resolvedModel = "ComboOffer";
      }
    }

    // Trigger daily redemption tracking (matches signature: offerId, merchantId, userId, shopId, offerModel)
    await trackOfferRedemption(
      offerId,
      targetMerchantId,
      userId,
      resolvedShopId,
      resolvedModel
    );

    // Increment sold_count if it's a ComboOffer
    if (resolvedModel === "ComboOffer") {
      await ComboOffer.updateOne({ _id: offerId }, { $inc: { sold_count: 1 } });
    }

    return res.status(200).json({
      success: true,
      message: `${resolvedModel === "ComboOffer" ? "Combo offer" : "Offer"} redemption successfully recorded.`,
      offerModel: resolvedModel,
    });
  } catch (error) {
    console.error("Record Offer Redemption Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/merchant/offer-clicks/:offerId
 * Optional query params:
 *   - type: "Offer" | "ComboOffer"
 *   - startDate: "YYYY-MM-DD"
 *   - endDate: "YYYY-MM-DD"
 *   - page: number (default 1)
 *   - limit: number (default 20)
 */

import OfferClick from "../models/offerClickModel.js";
export const getOfferClickDetailsByOfferId = async (req, res) => {
  try {
    const merchantId = req.merchant?._id;
    const { offerId } = req.params;
    const { type, startDate, endDate, page = 1, limit = 20 } = req.query;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: Merchant authentication required.",
      });
    }

    if (!offerId || !mongoose.Types.ObjectId.isValid(offerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Offer or Combo Offer ID format.",
      });
    }

    // 1. Verify ownership: ensure the Offer or ComboOffer belongs to this merchant
    let resolvedModel = "Offer";
    let campaign = null;

    if (type === "ComboOffer") {
      campaign = await ComboOffer.findOne({
        _id: offerId,
        merchantId,
        is_deleted: false,
      })
        .select("name description products tags start_date end_date")
        .lean();
      resolvedModel = "ComboOffer";
    } else if (type === "Offer") {
      campaign = await Offer.findOne({
        _id: offerId,
        merchant_id: merchantId,
        is_deleted: false,
      })
        .select("title description thumbnail discount_percentage discount_value start_date end_date")
        .lean();
      resolvedModel = "Offer";
    } else {
      // Auto-resolve: Check Offer first, then fall back to ComboOffer
      campaign = await Offer.findOne({
        _id: offerId,
        merchant_id: merchantId,
        is_deleted: false,
      })
        .select("title description thumbnail discount_percentage discount_value start_date end_date")
        .lean();

      if (campaign) {
        resolvedModel = "Offer";
      } else {
        campaign = await ComboOffer.findOne({
          _id: offerId,
          merchantId,
          is_deleted: false,
        })
          .select("name description products tags start_date end_date")
          .lean();
        resolvedModel = "ComboOffer";
      }
    }

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Offer or Combo Offer not found or does not belong to your merchant account.",
      });
    }

    // 2. Build OfferClick query scoped to merchantId, offerId, and offerModel
    const clickQuery = {
      merchantId: new mongoose.Types.ObjectId(merchantId),
      offerId: new mongoose.Types.ObjectId(offerId),
      offerModel: resolvedModel,
    };

    if (startDate || endDate) {
      clickQuery.date = {};
      if (startDate) {
        const parsedStart = new Date(`${startDate}T00:00:00.000Z`);
        if (!isNaN(parsedStart.getTime())) clickQuery.date.$gte = parsedStart;
      }
      if (endDate) {
        const parsedEnd = new Date(`${endDate}T23:59:59.999Z`);
        if (!isNaN(parsedEnd.getTime())) clickQuery.date.$lte = parsedEnd;
      }
    }

    // 3. Fetch daily click logs with populated clickedUsers
    const clickDocs = await OfferClick.find(clickQuery)
      .populate("clickedUsers.userId", "name email phone profileImage")
      .sort({ date: -1 })
      .lean();

    // 4. Aggregate totals, daily breakdown, and flattened clicked user logs
    let totalClicks = 0;
    const uniqueUserIdsSet = new Set();
    const allClickEvents = [];

    const dailyBreakdown = clickDocs.map((doc) => {
      totalClicks += doc.totalClicks || 0;

      const usersOnDay = (doc.clickedUsers || []).map((entry) => {
        const uIdStr = entry.userId?._id?.toString();
        if (uIdStr) uniqueUserIdsSet.add(uIdStr);

        const formattedUserClick = {
          date: doc.date,
          clickedAt: entry.clickedAt,
          user: entry.userId
            ? {
                _id: entry.userId._id,
                name: entry.userId.name || "BachatBazarr User",
                email: entry.userId.email || null,
                phone: entry.userId.phone || null,
                profileImage: entry.userId.profileImage || null,
              }
            : null,
        };

        allClickEvents.push(formattedUserClick);
        return formattedUserClick;
      });

      return {
        date: doc.date,
        totalClicks: doc.totalClicks || 0,
        uniqueUsersCount: usersOnDay.length,
        clickedUsers: usersOnDay,
      };
    });

    // Sort all click events newest first and paginate
    allClickEvents.sort((a, b) => new Date(b.clickedAt) - new Date(a.clickedAt));

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;
    const paginatedUsers = allClickEvents.slice(skip, skip + limitNum);

    return res.status(200).json({
      success: true,
      offer: {
        _id: campaign._id,
        offerModel: resolvedModel,
        title: resolvedModel === "ComboOffer" ? campaign.name : campaign.title,
        description: campaign.description || "",
        thumbnail:
          resolvedModel === "ComboOffer"
            ? campaign.products?.[0]?.image || null
            : campaign.thumbnail || null,
      },
      summary: {
        totalClicks,
        uniqueUsersCount: uniqueUserIdsSet.size,
        activeDaysCount: dailyBreakdown.length,
      },
      dailyBreakdown,
      clickedUsers: {
        total: allClickEvents.length,
        page: pageNum,
        totalPages: Math.ceil(allClickEvents.length / limitNum) || 1,
        data: paginatedUsers,
      },
    });
  } catch (error) {
    console.error("Get Offer Click Details By Offer ID Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve click analytics for this offer.",
      error: error.message,
    });
  }
};
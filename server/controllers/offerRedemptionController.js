import crypto from "crypto";
import Offer from "../models/offerModel.js";
import OfferRedemption from "../models/offerRedemptionModel.js";
import { trackDailyMetric, trackDailyMetric2, trackOfferMetric } from "../utils/analyticsTracker.js";
import MerchantShop from '../models/merchantShopModel.js';
import { onOfferClaimedHook, onOfferRedeemedHook,onFootfallVisitHook } from "../hooks/mileStoneProgressHooks.js";
import { notifyOnOfferRedemption } from "../utils/redemptionNotificationHelper.js";

import mongoose from "mongoose";
import ComboOffer from '../models/ComboOfferModel.js'
// ==========================================
//   USER SIDE CONTROLLERS
// ==========================================

/**
 * POST /api/offers/:offerId/redeem
 * User reserves an offer digitally in the app before visiting the physical store.
 */
export const redeemOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const userId = req.user._id;
    const requestedType = req.query.type || req.body?.type;
    const now = new Date();

    if (!mongoose.Types.ObjectId.isValid(offerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Offer or Combo ID format.",
      });
    }

    let resolvedModel = "Offer";
    let campaign = null;

    // 1. Resolve campaign from Offer or ComboOffer
    if (requestedType === "ComboOffer") {
      campaign = await ComboOffer.findOne({
        _id: offerId,
        is_active: true,
        is_deleted: false,
        approval_status: "approved",
      });
      resolvedModel = "ComboOffer";
    } else if (requestedType === "Offer") {
      campaign = await Offer.findOne({
        _id: offerId,
        is_active: true,
        is_deleted: false,
      });
      resolvedModel = "Offer";
    } else {
      // Auto-resolve: Check Offer first, then fall back to ComboOffer
      campaign = await Offer.findOne({
        _id: offerId,
        is_active: true,
        is_deleted: false,
      });

      if (campaign) {
        resolvedModel = "Offer";
      } else {
        campaign = await ComboOffer.findOne({
          _id: offerId,
          is_active: true,
          is_deleted: false,
          approval_status: "approved",
        });
        resolvedModel = "ComboOffer";
      }
    }

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: `The requested ${resolvedModel === "ComboOffer" ? "combo offer" : "offer"} is unavailable or no longer active.`,
      });
    }

    // 2. Check campaign validity window (start_date & end_date)
    if (campaign.start_date && campaign.start_date > now) {
      return res.status(400).json({
        success: false,
        message: "This campaign has not started yet.",
      });
    }

    if (campaign.end_date && campaign.end_date < now) {
      return res.status(400).json({
        success: false,
        message: `This ${resolvedModel === "ComboOffer" ? "combo offer" : "offer"} campaign has expired.`,
      });
    }

    // 3. Enforce overall claim/quantity limits
    if (resolvedModel === "Offer") {
      if (campaign.claim_limit !== undefined && campaign.claim_limit !== null) {
        if (campaign.redeemedCount >= campaign.claim_limit) {
          return res.status(400).json({
            success: false,
            message: `All available redemptions (${campaign.claim_limit}) for this offer have been claimed.`,
          });
        }
      }
    } else {
      if (campaign.offer_quantity !== undefined && campaign.offer_quantity !== null) {
        if (campaign.sold_count >= campaign.offer_quantity) {
          return res.status(400).json({
            success: false,
            message: `All available redemptions (${campaign.offer_quantity}) for this combo offer have been claimed.`,
          });
        }
      }
    }

    // 4. Enforce per-user limit
    const userRedemptionCount = await OfferRedemption.countDocuments({
      offerId,
      offerModel: resolvedModel,
      userId,
      status: { $in: ["redeemed", "claimed"] },
    });

    const perUserLimit = campaign.per_user_limit || (resolvedModel === "ComboOffer" ? 1 : null);
    if (perUserLimit && userRedemptionCount >= perUserLimit) {
      return res.status(400).json({
        success: false,
        message: `You have reached your limit of ${perUserLimit} redemption(s) for this ${resolvedModel === "ComboOffer" ? "combo offer" : "offer"}.`,
      });
    }

    // 5. Calculate expiration based on `redeem_time_hours` (default 24h) or `end_date`
    const hoursToMs = (campaign.redeem_time_hours || 24) * 60 * 60 * 1000;
    const calculatedExpiry = new Date(Date.now() + hoursToMs);

    const finalExpiresAt =
      campaign.end_date && campaign.end_date < calculatedExpiry
        ? campaign.end_date
        : calculatedExpiry;

    // 6. Resolve Merchant ID & Shop ID
    const targetMerchantId =
      resolvedModel === "ComboOffer" ? campaign.merchantId : campaign.merchant_id;

    let targetShopId = resolvedModel === "ComboOffer" ? campaign.shopId : campaign.shop_id;
    if (!targetShopId) {
      const merchantShop = await MerchantShop.findOne({ merchantId: targetMerchantId })
        .select("_id")
        .lean();
      targetShopId = merchantShop?._id || targetMerchantId;
    }

    // 7. Generate a unique 6-character redemption code
    const redemptionCode = "BB-" + crypto.randomBytes(3).toString("hex").toUpperCase();

    const redemption = new OfferRedemption({
      offerId,
      offerModel: resolvedModel,
      userId,
      shopId: targetShopId,
      merchantId: targetMerchantId,
      redemptionCode,
      expiresAt: finalExpiresAt,
      status: "redeemed",
    });

    await redemption.save();

    // 8. Atomically increment redemption counter on Offer or ComboOffer
    if (resolvedModel === "ComboOffer") {
      await ComboOffer.findByIdAndUpdate(offerId, { $inc: { sold_count: 1 } });
    } else {
      await Offer.findByIdAndUpdate(offerId, { $inc: { redeemedCount: 1 } });
    }

    // 9. Trigger notification
    const campaignTitle = resolvedModel === "ComboOffer" ? campaign.name : campaign.title;
    notifyOnOfferRedemption({
      userId,
      merchantId: targetMerchantId,
      offerId: campaign._id,
      offerModel: resolvedModel,
      offerTitle: campaignTitle,
      redemptionCode: redemption.redemptionCode,
      expiresAt: redemption.expiresAt,
      userName: req.user.name,
    });

    return res.status(201).json({
      success: true,
      message: `${resolvedModel === "ComboOffer" ? "Combo offer" : "Offer"} redeemed successfully! Show this code or QR in-store to claim your discount.`,
      data: {
        redemptionId: redemption._id,
        offerModel: resolvedModel,
        redemptionCode: redemption.redemptionCode,
        expiresAt: redemption.expiresAt,
        status: redemption.status,
      },
    });
  } catch (error) {
    console.error("Redeem Offer/Combo Processing Error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while processing your redemption.",
      error: error.message,
    });
  }
};


// ==========================================
//   MERCHANT SIDE CONTROLLERS
// ==========================================


export const claimOfferInStore = async (req, res) => {
  try {
    const { redemptionCode, offerId, userId, type } = req.body;

    if (!req.merchant) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: Missing merchant authentication profile.",
      });
    }

    if (!offerId || !mongoose.Types.ObjectId.isValid(offerId)) {
      return res.status(400).json({
        success: false,
        message: "Valid target offerId is required to verify in-store claim.",
      });
    }

    let resolvedModel = "Offer";
    let campaign = null;

    // 1. Resolve campaign belonging to this merchant (Offer or ComboOffer)
    if (type === "ComboOffer") {
      campaign = await ComboOffer.findOne({
        _id: offerId,
        merchantId: req.merchant._id,
        is_deleted: false,
      });
      resolvedModel = "ComboOffer";
    } else if (type === "Offer") {
      campaign = await Offer.findOne({
        _id: offerId,
        merchant_id: req.merchant._id,
        is_deleted: false,
      });
      resolvedModel = "Offer";
    } else {
      // Auto-resolve: Check Offer first, then fall back to ComboOffer
      campaign = await Offer.findOne({
        _id: offerId,
        merchant_id: req.merchant._id,
        is_deleted: false,
      });

      if (campaign) {
        resolvedModel = "Offer";
      } else {
        campaign = await ComboOffer.findOne({
          _id: offerId,
          merchantId: req.merchant._id,
          is_deleted: false,
        });
        resolvedModel = "ComboOffer";
      }
    }

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Offer or Combo Offer not found or does not belong to your store profile.",
      });
    }

    const campaignTitle =
      resolvedModel === "ComboOffer" ? campaign.name : campaign.title;

    // 2. Locate the redemption document
    const redemptionQuery = {
      offerId,
      offerModel: resolvedModel,
      merchantId: req.merchant._id,
    };

    if (redemptionCode) {
      redemptionQuery.redemptionCode = redemptionCode.trim().toUpperCase();
    } else if (userId) {
      redemptionQuery.userId = userId;
      redemptionQuery.status = "redeemed";
    } else {
      return res.status(400).json({
        success: false,
        message:
          "Provide either a redemptionCode or userId to identify the target redemption record.",
      });
    }

    const redemption = await OfferRedemption.findOne(redemptionQuery);

    if (!redemption) {
      return res.status(404).json({
        success: false,
        message: `No active redemption found for this ${resolvedModel === "ComboOffer" ? "combo offer" : "offer"} matching the provided code/user.`,
      });
    }

    // 3. Status and Expiration validations
    if (redemption.status === "claimed") {
      return res.status(400).json({
        success: false,
        message: `This ${resolvedModel === "ComboOffer" ? "combo offer" : "offer"} was already claimed on ${redemption.claimedAt?.toLocaleString()}.`,
      });
    }

    if (redemption.status === "expired" || redemption.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "This redemption window has expired.",
      });
    }

    // 4. Enforce claim/quantity limit as safeguard
    if (resolvedModel === "Offer") {
      if (campaign.claim_limit !== undefined && campaign.claim_limit !== null) {
        if (campaign.claimedCount >= campaign.claim_limit) {
          return res.status(400).json({
            success: false,
            message: `Claim limit reached: All ${campaign.claim_limit} claims for this offer have been processed.`,
          });
        }
      }
    } else {
      // Note: sold_count is incremented when the user reserves/redeems the combo;
      // guard against exceeding offer_quantity if > is violated
      if (campaign.offer_quantity !== undefined && campaign.offer_quantity !== null) {
        if (campaign.sold_count > campaign.offer_quantity) {
          return res.status(400).json({
            success: false,
            message: `Claim limit reached: All ${campaign.offer_quantity} claims for this combo offer have been processed.`,
          });
        }
      }
    }

    // 5. Mark redemption as claimed
    redemption.status = "claimed";
    redemption.claimedAt = new Date();
    await redemption.save();

    // 6. Atomically increment claimedCount on standard Offer (ComboOffer tracks via sold_count at redeem time)
    if (resolvedModel === "Offer") {
      await Offer.findByIdAndUpdate(offerId, { $inc: { claimedCount: 1 } });
    }

    const targetUserId = userId || redemption.userId;
    const code = redemption.redemptionCode;

    // 7. Fire metric tracking pipelines
    if (typeof onOfferClaimedHook === "function") {
      await onOfferClaimedHook(req.merchant._id, targetUserId);
    }

    if (typeof trackOfferMetric === "function") {
      await trackOfferMetric(offerId, req.merchant._id, "claims", {
        userId: targetUserId,
        offerModel: resolvedModel,
        code,
      });
      await trackOfferMetric(offerId, req.merchant._id, "footfall", {
        userId: targetUserId,
        offerModel: resolvedModel,
        code,
      });
    }

    return res.status(200).json({
      success: true,
      message: `${resolvedModel === "ComboOffer" ? "Combo offer" : "Offer"} successfully verified and claimed in-store!`,
      data: {
        offerModel: resolvedModel,
        offerTitle: campaignTitle,
        redemptionCode: redemption.redemptionCode,
        claimedAt: redemption.claimedAt,
      },
    });
  } catch (error) {
    console.error("In-Store Claim Verification Error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while verifying the claim.",
      error: error.message,
    });
  }
};

/**
 * GET /api/merchant/offers/analytics
 * Provides metrics on total offers, redeemed counts, claimed counts, and remaining claim limits.
 */
export const getMerchantOfferAnalytics = async (req, res) => {
  try {
    if (!req.merchant) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: Missing merchant authentication profile."
      });
    }

    const offers = await Offer.find({ merchant_id: req.merchant._id, is_deleted: false })
      .select("title claim_limit redeemedCount claimedCount start_date end_date is_active")
      .sort({ createdAt: -1 })
      .lean();

    const formattedAnalytics = offers.map((offer) => {
      const limit = offer.claim_limit !== undefined && offer.claim_limit !== null ? offer.claim_limit : null;
      const remainingRedemptions = limit !== null ? Math.max(0, limit - (offer.redeemedCount || 0)) : "Unlimited";
      const remainingClaims = limit !== null ? Math.max(0, limit - (offer.claimedCount || 0)) : "Unlimited";

      return {
        _id: offer._id,
        title: offer.title,
        claimLimit: limit || "Unlimited",
        totalRedeemed: offer.redeemedCount || 0,
        totalClaimed: offer.claimedCount || 0,
        remainingRedemptions,
        remainingClaims,
        pendingInStoreClaims: (offer.redeemedCount || 0) - (offer.claimedCount || 0),
        isActive: offer.is_active,
        startDate: offer.start_date,
        endDate: offer.end_date
      };
    });

    return res.status(200).json({
      success: true,
      totalOffersCount: offers.length,
      data: formattedAnalytics
    });

  } catch (error) {
    console.error("Merchant Offer Analytics Error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while loading offer analytics.",
      error: error.message
    });
  }
};

const generateUniqueClaimCode = () => {
  const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `BB-${Date.now().toString(36).toUpperCase()}-${randomHex}`;
};

export const userSelfClaimOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const userId = req.user._id;

    // 1. Fetch active offer
    const offer = await Offer.findOne({ _id: offerId, is_active: true, is_deleted: false });
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "The requested offer is no longer available.",
      });
    }

    // 2. Validate offer expiration date
    const now = new Date();
    if (offer.end_date && new Date(offer.end_date) < now) {
      return res.status(400).json({
        success: false,
        message: "This offer campaign has expired.",
      });
    }

    // 3. ENFORCE OVERALL CLAIM LIMIT
    if (offer.claim_limit !== undefined && offer.claim_limit !== null) {
      if (offer.claimedCount >= offer.claim_limit) {
        return res.status(400).json({
          success: false,
          message: `Claim limit reached! All ${offer.claim_limit} claims for this offer have already been taken.`,
        });
      }
    }

    // 4. ENFORCE PER-USER LIMIT
    const userClaimCount = await OfferRedemption.countDocuments({
      offerId,
      userId,
      status: "claimed",
    });

    if (offer.per_user_limit && userClaimCount >= offer.per_user_limit) {
      return res.status(400).json({
        success: false,
        message: `You have already claimed this offer ${offer.per_user_limit} time(s).`,
      });
    }

    // 5. Check for an existing uncompleted "redeemed" record
    let redemption = await OfferRedemption.findOne({
      offerId,
      userId,
      status: "redeemed",
    });

    let wasDirectClaim = false;

    if (redemption) {
      // Transition already-redeemed record to claimed
      redemption.status = "claimed";
      redemption.claimedAt = new Date();
      await redemption.save();
    } else {
      // User directly claimed without prior redemption: create record marked as both redeemed and claimed
      wasDirectClaim = true;
      const uniqueCode = generateUniqueClaimCode();

      const hoursToMs = (offer.redeem_time_hours || 24) * 60 * 60 * 1000;
      const calculatedExpiry = new Date(Date.now() + hoursToMs);
      const finalExpiresAt =
        offer.end_date && new Date(offer.end_date) < calculatedExpiry
          ? new Date(offer.end_date)
          : calculatedExpiry;

      redemption = new OfferRedemption({
        offerId,
        userId,
        shopId: offer.merchant_id,
        merchantId: offer.merchant_id,
        redemptionCode: uniqueCode,
        expiresAt: finalExpiresAt,
        status: "claimed",
        redeemedAt: new Date(),
        claimedAt: new Date(),
      });

      await redemption.save();
    }

    // 6. Atomically update offer counters (increment redeemedCount as well if this was a direct claim)
    await Offer.findByIdAndUpdate(offerId, {
      $inc: {
        claimedCount: 1,
        ...(wasDirectClaim ? { redeemedCount: 1 } : {}),
      },
    });

    const redemptionCode = redemption.redemptionCode;

    // 7. Track analytics and execute hooks
    if (wasDirectClaim) {
      if (typeof trackDailyMetric2 === "function") {
        await trackOfferMetric(offerId,offer.merchant_id,"redeems",{userId:userId});
        await trackDailyMetric2(offer.merchant_id, "redeems", {
          userId,
          offerId,
          redemptionCode,
        });
      }
      if (typeof onOfferRedeemedHook === "function") {
        await onOfferRedeemedHook(offer.merchant_id, userId);
      }
    }

    if (typeof trackDailyMetric2 === "function") {
      await trackDailyMetric2(offer.merchant_id, "footfall", {
        userId,
        offerId,
        redemptionCode,
      });
    }

    if (typeof trackOfferMetric === "function") {
      await trackOfferMetric(offerId, offer.merchant_id, "claims", {
        userId,
        redemptionCode,
      });
    }

    if (typeof onOfferClaimedHook === "function") {
      await onOfferClaimedHook(offer.merchant_id, userId);
    }

    return res.status(200).json({
      success: true,
      message: "Offer successfully claimed! Show this confirmation screen to the shopkeeper.",
      data: {
        offerTitle: offer.title,
        redemptionCode: redemption.redemptionCode,
        claimedAt: redemption.claimedAt,
        status: redemption.status,
      },
    });
  } catch (error) {
    console.error("Direct User Claim Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while processing your claim.",
      error: error.message,
    });
  }
};


const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

export const userSelfClaimOffer2 = async (req, res) => {
  try {
    const { offerId } = req.params;
    const userId = req.user._id;
    const requestedType = req.query.type || req.body?.type; // Optional hint: "Offer" | "ComboOffer"

    if (!mongoose.Types.ObjectId.isValid(offerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Offer or Combo ID format.",
      });
    }

    // 0. Extract user coordinates from body or query
    const rawLat = req.body.latitude ?? req.body.lat ?? req.query.lat;
    const rawLng = req.body.longitude ?? req.body.lng ?? req.query.lng;

    if (
      rawLat === undefined ||
      rawLng === undefined ||
      rawLat === null ||
      rawLng === null ||
      rawLat === "" ||
      rawLng === ""
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Your device location coordinates (latitude and longitude) are required to verify in-store redemption.",
      });
    }

    const userLat = Number(rawLat);
    const userLng = Number(rawLng);

    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({
        success: false,
        message: "Provided location coordinates are invalid numbers.",
      });
    }

    // 1. Resolve active, non-deleted campaign from Offer or ComboOffer
    let resolvedModel = "Offer";
    let campaign = null;

    if (requestedType === "ComboOffer") {
      campaign = await ComboOffer.findOne({
        _id: offerId,
        is_active: true,
        is_deleted: false,
        approval_status: "approved",
      });
      resolvedModel = "ComboOffer";
    } else if (requestedType === "Offer") {
      campaign = await Offer.findOne({
        _id: offerId,
        is_active: true,
        is_deleted: false,
        is_draft: false,
        is_paused: false,
      });
      resolvedModel = "Offer";
    } else {
      // Auto-resolve: Check Offer first, then fall back to ComboOffer
      campaign = await Offer.findOne({
        _id: offerId,
        is_active: true,
        is_deleted: false,
        is_draft: false,
        is_paused: false,
      });

      if (campaign) {
        resolvedModel = "Offer";
      } else {
        campaign = await ComboOffer.findOne({
          _id: offerId,
          is_active: true,
          is_deleted: false,
          approval_status: "approved",
        });
        resolvedModel = "ComboOffer";
      }
    }

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: `The requested ${resolvedModel === "ComboOffer" ? "combo offer" : "offer"} is no longer available or is currently paused.`,
      });
    }

    const targetMerchantId =
      resolvedModel === "ComboOffer" ? campaign.merchantId : campaign.merchant_id;
    const targetShopId =
      resolvedModel === "ComboOffer" ? campaign.shopId : campaign.shop_id;
    const campaignTitle =
      resolvedModel === "ComboOffer" ? campaign.name : campaign.title;

    // 2. Locate the Merchant's physical shop for coordinate validation
    const shopQuery = targetShopId
      ? { _id: targetShopId }
      : { merchantId: targetMerchantId };

    const shop = await MerchantShop.findOne(shopQuery)
      .select("latitude longitude shopName")
      .lean();

    // Fallback coordinates: check shop schema first, then offer location GeoJSON Point
    const shopLat =
      shop?.latitude ??
      (resolvedModel === "Offer" ? campaign.location?.coordinates?.[1] : null) ??
      null;
    const shopLng =
      shop?.longitude ??
      (resolvedModel === "Offer" ? campaign.location?.coordinates?.[0] : null) ??
      null;

    if (shopLat === null || shopLng === null) {
      return res.status(400).json({
        success: false,
        message:
          "Merchant shop GPS coordinates are not configured. Cannot verify in-store presence.",
      });
    }

    // 3. Distance Verification (50-Meter In-Store Boundary)
    const MAX_ALLOWED_DISTANCE_METERS = 50;
    const distanceMeters = getDistanceInMeters(userLat, userLng, shopLat, shopLng);

    if (distanceMeters > MAX_ALLOWED_DISTANCE_METERS) {
      return res.status(403).json({
        success: false,
        message: `You are not at the shop, cannot redeem. You must be within 50 meters of the store to claim this ${resolvedModel === "ComboOffer" ? "combo offer" : "offer"} (current distance: ${distanceMeters}m).`,
        data: {
          currentDistanceMeters: distanceMeters,
          requiredRadiusMeters: MAX_ALLOWED_DISTANCE_METERS,
        },
      });
    }

    // 4. Validate campaign start & expiration dates
    const now = new Date();
    if (campaign.start_date && new Date(campaign.start_date) > now) {
      return res.status(400).json({
        success: false,
        message: "This campaign has not started yet.",
      });
    }

    if (campaign.end_date && new Date(campaign.end_date) < now) {
      return res.status(400).json({
        success: false,
        message: `This ${resolvedModel === "ComboOffer" ? "combo offer" : "offer"} campaign has expired.`,
      });
    }

    // 5. ENFORCE OVERALL CLAIM / QUANTITY LIMIT
    if (resolvedModel === "Offer") {
      if (campaign.claim_limit !== undefined && campaign.claim_limit !== null) {
        if (campaign.claimedCount >= campaign.claim_limit) {
          return res.status(400).json({
            success: false,
            message: `Claim limit reached! All ${campaign.claim_limit} claims for this offer have already been taken.`,
          });
        }
      }
    } else {
      if (campaign.offer_quantity !== undefined && campaign.offer_quantity !== null) {
        if (campaign.sold_count >= campaign.offer_quantity) {
          return res.status(400).json({
            success: false,
            message: `Claim limit reached! All ${campaign.offer_quantity} claims for this combo offer have already been taken.`,
          });
        }
      }
    }

    // 6. ENFORCE PER-USER LIMIT
    const userClaimCount = await OfferRedemption.countDocuments({
      offerId,
      offerModel: resolvedModel,
      userId,
      status: "claimed",
    });

    const perUserLimit =
      campaign.per_user_limit || (resolvedModel === "ComboOffer" ? 1 : null);
    if (perUserLimit && userClaimCount >= perUserLimit) {
      return res.status(400).json({
        success: false,
        message: `You have already claimed this ${resolvedModel === "ComboOffer" ? "combo offer" : "offer"} ${perUserLimit} time(s).`,
      });
    }

    // 7. Check for an existing uncompleted "redeemed" record
    let redemption = await OfferRedemption.findOne({
      offerId,
      offerModel: resolvedModel,
      userId,
      status: "redeemed",
    });

    let wasDirectClaim = false;

    if (redemption) {
      // Transition already-redeemed record to claimed
      redemption.status = "claimed";
      redemption.claimedAt = new Date();
      await redemption.save();
    } else {
      // Direct claim without prior reserve
      wasDirectClaim = true;
      const uniqueCode =
        typeof generateUniqueClaimCode === "function"
          ? generateUniqueClaimCode()
          : Math.floor(100000 + Math.random() * 900000).toString();

      const hoursToMs = (campaign.redeem_time_hours || 24) * 60 * 60 * 1000;
      const calculatedExpiry = new Date(Date.now() + hoursToMs);
      const finalExpiresAt =
        campaign.end_date && new Date(campaign.end_date) < calculatedExpiry
          ? new Date(campaign.end_date)
          : calculatedExpiry;

      redemption = new OfferRedemption({
        offerId,
        offerModel: resolvedModel,
        userId,
        shopId: shop?._id || targetShopId || targetMerchantId,
        merchantId: targetMerchantId,
        redemptionCode: uniqueCode,
        expiresAt: finalExpiresAt,
        status: "claimed",
        redeemedAt: new Date(),
        claimedAt: new Date(),
      });

      await redemption.save();
    }

    // 8. Atomically update campaign counters
    if (resolvedModel === "ComboOffer") {
      // Only increment sold_count on direct claim if pre-redeem didn't already increment it
      if (wasDirectClaim) {
        await ComboOffer.findByIdAndUpdate(offerId, {
          $inc: { sold_count: 1 },
        });
      }
    } else {
      await Offer.findByIdAndUpdate(offerId, {
        $inc: {
          claimedCount: 1,
          ...(wasDirectClaim ? { redeemedCount: 1 } : {}),
        },
      });
    }

    const redemptionCode = redemption.redemptionCode;

    // 9. Track analytics and execute hooks
    if (wasDirectClaim) {
      if (typeof trackOfferMetric === "function") {
        await trackOfferMetric(offerId, targetMerchantId, "redeems", {
          userId,
          offerModel: resolvedModel,
        });
      }
      if (typeof trackDailyMetric2 === "function") {
        await trackDailyMetric2(targetMerchantId, "redeems", {
          userId,
          offerId,
          offerModel: resolvedModel,
          redemptionCode,
        });
      }
      if (typeof onOfferRedeemedHook === "function") {
        await onOfferRedeemedHook(targetMerchantId, userId);
      }
    }

    if (typeof trackDailyMetric2 === "function") {
      await trackDailyMetric2(targetMerchantId, "footfall", {
        userId,
        offerId,
        offerModel: resolvedModel,
        redemptionCode,
      });
    }

    if (typeof trackOfferMetric === "function") {
      await trackOfferMetric(offerId, targetMerchantId, "claims", {
        userId,
        offerModel: resolvedModel,
        redemptionCode,
      });
    }

    if (typeof onOfferClaimedHook === "function") {
      await onOfferClaimedHook(targetMerchantId, userId);
    }

    return res.status(200).json({
      success: true,
      message: `${resolvedModel === "ComboOffer" ? "Combo offer" : "Offer"} successfully claimed! Show this confirmation screen to the shopkeeper.`,
      data: {
        offerModel: resolvedModel,
        offerTitle: campaignTitle,
        redemptionCode: redemption.redemptionCode,
        claimedAt: redemption.claimedAt,
        status: redemption.status,
        distanceMeters,
      },
    });
  } catch (error) {
    console.error("Direct User Claim Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while processing your claim.",
      error: error.message,
    });
  }
};

export const getUserOfferHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status = "all", page = 1, limit = 10, type = "all" } = req.query;

    // 1. Build Query Filter
    const query = { userId };

    if (status === "redeemed") {
      query.status = "redeemed";
    } else if (status === "claimed") {
      query.status = "claimed";
    } else {
      // "all" tab loads both redeemed & claimed records
      query.status = { $in: ["redeemed", "claimed"] };
    }

    // Optional filter: "Offer" | "ComboOffer" | "all"
    if (type === "Offer" || type === "ComboOffer") {
      query.offerModel = type;
    }

    // 2. Setup Pagination
    const currentLimit = Number(limit);
    const skip = (Math.max(1, Number(page)) - 1) * currentLimit;

    // 3. Count total matching redemptions/claims
    const totalRecords = await OfferRedemption.countDocuments(query);

    // 4. Fetch list with dynamic refPath population (Offer & ComboOffer) and Shop/Merchant details
    const history = await OfferRedemption.find(query)
      .populate({
        path: "offerId",
        select:
          "title name description thumbnail products tags discount_percentage discount_value start_date end_date redeem_time_hours only_for_walk_in_customers terms_and_conditions",
      })
      .populate({
        path: "shopId",
        select: "shopName address city phone logo banner",
      })
      .populate({
        path: "merchantId",
        select: "name store_name shopName address city phone logo banner profileImage",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(currentLimit)
      .lean();

    // 5. Format payload and normalize Offer vs ComboOffer fields
    const now = new Date();
    const formattedData = history.map((record) => {
      const isExpired = record.status === "redeemed" && record.expiresAt < now;
      const isCombo = record.offerModel === "ComboOffer";
      const campaign = record.offerId;

      // Resolve shop info from shopId first, falling back to merchantId
      const shopSource = record.shopId?.shopName ? record.shopId : record.merchantId;

      // For ComboOffers, use first product image as fallback thumbnail if no dedicated thumbnail exists
      const resolvedThumbnail = isCombo
        ? campaign?.thumbnail || campaign?.products?.[0]?.image || null
        : campaign?.thumbnail || null;

      return {
        redemptionId: record._id,
        offerModel: record.offerModel || "Offer",
        redemptionCode: record.redemptionCode,
        status: isExpired ? "expired" : record.status,
        redeemedAt: record.redeemedAt,
        claimedAt: record.claimedAt,
        expiresAt: record.expiresAt,
        offerDetails: campaign
          ? {
              offerId: campaign._id,
              offerModel: record.offerModel || "Offer",
              title: isCombo ? campaign.name : campaign.title,
              description: campaign.description,
              thumbnail: resolvedThumbnail,
              discountPercentage: isCombo ? null : campaign.discount_percentage,
              discountValue: isCombo ? null : campaign.discount_value,
              // Combo-specific fields included cleanly when applicable
              ...(isCombo && {
                tags: campaign.tags || [],
                products: campaign.products || [],
                termsAndConditions: campaign.terms_and_conditions || null,
              }),
            }
          : null,
        shopDetails: shopSource
          ? {
              shopId: shopSource._id,
              shopName:
                shopSource.shopName ||
                shopSource.store_name ||
                shopSource.name ||
                "BachatBazarr Partner",
              address: shopSource.address || "",
              city: shopSource.city || "",
              phone: shopSource.phone || "",
              logo: shopSource.logo || shopSource.profileImage || null,
            }
          : null,
      };
    });

    return res.status(200).json({
      success: true,
      total: totalRecords,
      pages: Math.ceil(totalRecords / currentLimit) || 1,
      currentPage: Number(page),
      data: formattedData,
    });
  } catch (error) {
    console.error("User Offer History Fetch Error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while retrieving your offer history.",
      error: error.message,
    });
  }
};

export const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: Missing authenticated user context."
      });
    }

    const { mode = "soft" } = req.query; // Expects mode = "soft" (default) or "hard"

    if (mode === "hard") {
      // --- OPTION A: HARD DELETE (Permanent removal) ---
      
      // 1. Wipe or cleanup dependent records (Optional cleanup pipeline)
      await OfferRedemption.deleteMany({ userId });
      await BestPriceRequest.deleteMany({ userId });

      // 2. Permanently delete the user document
      const deletedUser = await User.findByIdAndDelete(userId);

      if (!deletedUser) {
        return res.status(404).json({
          success: false,
          message: "User profile record not found."
        });
      }

      return res.status(200).json({
        success: true,
        message: "Your account and associated personal data have been permanently deleted."
      });

    } else {
      // --- OPTION B: SOFT DELETE (Recommended for Data Integrity) ---
      
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User profile record not found."
        });
      }

      if (user.is_deleted) {
        return res.status(400).json({
          success: false,
          message: "This account has already been deleted."
        });
      }

      // Anonymize personal details to comply with privacy rules while keeping system references intact
      user.is_deleted = true;
      user.is_active = false;
      user.deletedAt = new Date();
      user.name = "Deleted User";
      user.email = `deleted_${userId}_${Date.now()}@deleted.com`;
      user.phoneNumber = null;
      user.profileImage = null;

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Your account has been successfully deactivated and marked for deletion."
      });
    }

  } catch (error) {
    console.error("User Deletion Controller Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while processing account deletion.",
      error: error.message
    });
  }
};

export const cancelUserOfferRedemption = async (req, res) => {
  try {
    const { redemptionId } = req.params;
    const userId = req.user._id;

    // 1. Locate the redemption document belonging to the authenticated user
    const redemption = await OfferRedemption.findOne({
      _id: redemptionId,
      userId
    });

    if (!redemption) {
      return res.status(404).json({
        success: false,
        message: "Redemption record not found or access denied."
      });
    }

    // 2. Prevent deletion if the offer has already been claimed in-store
    if (redemption.status === "claimed") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a redemption that has already been claimed in-store."
      });
    }

    const offerId = redemption.offerId;

    // 3. Delete the redemption document
    await OfferRedemption.findByIdAndDelete(redemptionId);

    // 4. Atomically decrement redeemedCount on the parent Offer (ensuring it doesn't drop below 0)
    await Offer.findByIdAndUpdate(offerId, {
      $inc: { redeemedCount: -1 }
    });

    return res.status(200).json({
      success: true,
      message: "Offer redemption successfully cancelled and removed."
    });

  } catch (error) {
    console.error("Cancel User Offer Redemption Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while cancelling your redemption.",
      error: error.message
    });
  }
};
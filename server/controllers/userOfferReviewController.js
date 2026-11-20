import mongoose from "mongoose";
import Offer from "../models/offerModel.js";
import ComboOffer from "../models/ComboOfferModel.js";
import MerchantShop from "../models/merchantShopModel.js";
import OfferRedemption from "../models/offerRedemptionModel.js";
import UserOfferReview from "../models/userOfferReviewModel.js";

/**
 * POST /api/user/offer-reviews
 * Body: { offerId, type?: "Offer" | "ComboOffer", redemptionId?, shopId?, rating, title, description, images?, tags? }
 * Submits a user review for either a standard Offer or a ComboOffer.
 */
export const createUserOfferReview = async (req, res) => {
  try {
    const userId = req.user?._id;
    const {
      offerId,
      type, // Optional hint: "Offer" | "ComboOffer"
      redemptionId,
      shopId: bodyShopId,
      rating,
      title,
      description,
      images,
      tags,
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to submit a review.",
      });
    }

    if (!offerId || !rating || !title || !description) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (offerId, rating, title, description).",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(offerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Offer or Combo Offer ID format.",
      });
    }

    // 1. Resolve campaign from Offer or ComboOffer
    let resolvedModel = "Offer";
    let campaign = null;

    if (type === "ComboOffer") {
      campaign = await ComboOffer.findOne({ _id: offerId, is_deleted: false }).lean();
      resolvedModel = "ComboOffer";
    } else if (type === "Offer") {
      campaign = await Offer.findOne({ _id: offerId, is_deleted: false }).lean();
      resolvedModel = "Offer";
    } else {
      // Auto-resolve: Check Offer first, then fall back to ComboOffer
      campaign = await Offer.findOne({ _id: offerId, is_deleted: false }).lean();
      if (campaign) {
        resolvedModel = "Offer";
      } else {
        campaign = await ComboOffer.findOne({ _id: offerId, is_deleted: false }).lean();
        resolvedModel = "ComboOffer";
      }
    }

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "The target offer or combo offer does not exist or has been removed.",
      });
    }

    const merchantId =
      resolvedModel === "ComboOffer" ? campaign.merchantId : campaign.merchant_id;

    // 2. Resolve and verify Shop belonging to this merchant
    const preferredShopId =
      bodyShopId ||
      (resolvedModel === "ComboOffer" ? campaign.shopId : campaign.shop_id) ||
      null;

    const shopQuery = preferredShopId
      ? { _id: preferredShopId, merchantId }
      : { merchantId };

    const shop = await MerchantShop.findOne(shopQuery).select("_id").lean();
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "The specified merchant shop location is invalid.",
      });
    }
    const shopId = shop._id;

    // 3. Check for duplicate review from this user on this offer/combo
    const existingReview = await UserOfferReview.findOne({
      userId,
      offerId,
      offerModel: resolvedModel,
      is_deleted: false,
    }).lean();

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: `You have already submitted a review for this ${resolvedModel === "ComboOffer" ? "combo offer" : "offer"}.`,
      });
    }

    // 4. Verify purchase/redemption status (checks OfferRedemption across both Offer & ComboOffer)
    let isVerifiedPurchase = false;
    if (redemptionId && mongoose.Types.ObjectId.isValid(redemptionId)) {
      const redemption = await OfferRedemption.findOne({
        _id: redemptionId,
        userId,
        offerId,
        offerModel: resolvedModel,
        status: { $in: ["redeemed", "claimed"] },
      }).lean();
      if (redemption) {
        isVerifiedPurchase = true;
      }
    } else {
      const anyRedemption = await OfferRedemption.findOne({
        userId,
        offerId,
        offerModel: resolvedModel,
        status: { $in: ["redeemed", "claimed"] },
      }).lean();
      if (anyRedemption) {
        isVerifiedPurchase = true;
      }
    }

    // 5. Normalize and validate images and tags arrays
    const normalizedImages = Array.isArray(images)
      ? images.slice(0, 5)
      : typeof images === "string" && images.trim()
      ? [images.trim()]
      : [];

    const normalizedTags = Array.isArray(tags)
      ? tags.map((t) => t.trim()).filter(Boolean)
      : typeof tags === "string"
      ? tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    // 6. Create and save the review document
    const newReview = new UserOfferReview({
      userId,
      merchantId,
      offerId,
      offerModel: resolvedModel,
      shopId,
      redemptionId: redemptionId || null,
      rating: Number(rating),
      title: title.trim(),
      description: description.trim(),
      images: normalizedImages,
      tags: normalizedTags,
      isVerifiedPurchase,
      approvalStatus: "approved",
    });

    await newReview.save();

    return res.status(201).json({
      success: true,
      message: `${resolvedModel === "ComboOffer" ? "Combo offer" : "Offer"} review submitted successfully.`,
      data: newReview,
    });
  } catch (error) {
    console.error("Create User Offer/Combo Review Error:", error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already submitted a review for this offer.",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to submit review.",
      error: error.message,
    });
  }
};
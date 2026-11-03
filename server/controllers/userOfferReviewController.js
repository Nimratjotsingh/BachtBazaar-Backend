import mongoose from "mongoose";
import UserOfferReview from "../models/userOfferReviewModel.js";
import OfferRedemption from "../models/offerRedemptionModel.js";
import Offer from "../models/offerModel.js";
import MerchantShop from "../models/merchantShopModel.js";

/**
 * POST /api/user/offer-reviews
 * Creates a new user review for a merchant offer.
 */
export const createUserOfferReview = async (req, res) => {
  try {
    const userId = req.user?._id; // Extracted from user authentication middleware
    const {
      offerId,
      redemptionId,
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

    if (!offerId ||  !rating || !title || !description) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (offerId, shopId, rating, title, description).",
      });
    }

    // 1. Fetch Offer to verify it exists and get its merchantId
    const offer = await Offer.findOne({ _id: offerId, is_deleted: false });
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "The target offer does not exist or has been removed.",
      });
    }

    const merchantId = offer.merchant_id;

    // 2. Verify Shop belongs to this merchant
    const shop = await MerchantShop.findOne({  merchantId });
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "The specified merchant shop location is invalid.",
      });
    }
    let shopId = shop._id;

    // 3. Check for duplicate review from this user on this offer
    const existingReview = await UserOfferReview.findOne({ userId, offerId, is_deleted: false });
    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: "You have already submitted a review for this offer.",
      });
    }

    // 4. Verify purchase/redemption status if redemptionId is provided
    let isVerifiedPurchase = false;
    if (redemptionId) {
      const redemption = await OfferRedemption.findOne({
        _id: redemptionId,
        userId,
        offerId,
        status: { $in: ["redeemed", "claimed"] },
      });
      if (redemption) {
        isVerifiedPurchase = true;
      }
    } else {
      // Alternatively, check if the user has any completed/redeemed history for this offer
      const anyRedemption = await OfferRedemption.findOne({
        userId,
        offerId,
        status: { $in: ["redeemed", "claimed"] },
      });
      if (anyRedemption) {
        isVerifiedPurchase = true;
      }
    }

    // 5. Normalize and validate images and tags arrays
    const normalizedImages = Array.isArray(images)
      ? images.slice(0, 5)
      : typeof images === "string"
      ? [images]
      : [];

    const normalizedTags = Array.isArray(tags)
      ? tags.map((t) => t.trim()).filter(Boolean)
      : typeof tags === "string"
      ? tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    // 6. Create the review document
    const newReview = new UserOfferReview({
      userId,
      merchantId,
      offerId,
      shopId,
      redemptionId: redemptionId || null,
      rating: Number(rating),
      title: title.trim(),
      description: description.trim(),
      images: normalizedImages,
      tags: normalizedTags,
      isVerifiedPurchase,
      approvalStatus: "approved", // Set to "pending" if moderation queue is preferred
    });

    await newReview.save();

    return res.status(201).json({
      success: true,
      message: "Offer review submitted successfully.",
      data: newReview,
    });
  } catch (error) {
    console.error("Create User Offer Review Error:", error);
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
import mongoose from "mongoose";
import Offer from "../models/offerModel.js";
import ComboOffer from "../models/ComboOfferModel.js";
import UserOfferReview from "../models/userOfferReviewModel.js";

/**
 * GET /api/merchant/offer-reviews
 * Retrieves paginated user reviews for the authenticated merchant's offers,
 * along with aggregated rating statistics.
 */
export const getMerchantOfferReviews = async (req, res) => {
  try {
    const merchantId = req.merchant?._id;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: Merchant authentication required.",
      });
    }

    const {
      page = 1,
      limit = 10,
      offerId,
      rating,
      verifiedOnly,
      search,
    } = req.query;

    // 1. Base query scoped strictly to the logged-in merchant
    const query = {
      merchantId: new mongoose.Types.ObjectId(merchantId),
      is_deleted: false,
      approvalStatus: "approved",
    };

    if (offerId && mongoose.Types.ObjectId.isValid(offerId)) {
      query.offerId = new mongoose.Types.ObjectId(offerId);
    }

    if (rating && !isNaN(Number(rating))) {
      query.rating = Number(rating);
    }

    if (verifiedOnly === "true") {
      query.isVerifiedPurchase = true;
    }

    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
        { tags: { $in: [new RegExp(search.trim(), "i")] } },
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    // 2. Fetch paginated reviews, total count, and overall rating stats in parallel
    const [reviews, totalReviews, statsAgg] = await Promise.all([
      UserOfferReview.find(query)
        .populate("userId", "name profileImage")
        .populate("offerId", "title name thumbnail")
        .populate("shopId", "shopName city")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),

      UserOfferReview.countDocuments(query),

      UserOfferReview.aggregate([
        {
          $match: {
            merchantId: new mongoose.Types.ObjectId(merchantId),
            is_deleted: false,
            approvalStatus: "approved",
            ...(offerId && mongoose.Types.ObjectId.isValid(offerId)
              ? { offerId: new mongoose.Types.ObjectId(offerId) }
              : {}),
          },
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            totalCount: { $sum: 1 },
            verifiedCount: {
              $sum: { $cond: ["$isVerifiedPurchase", 1, 0] },
            },
            fiveStar: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
            fourStar: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
            threeStar: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
            twoStar: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
            oneStar: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const summary =
      statsAgg.length > 0
        ? {
            averageRating: Math.round(statsAgg[0].averageRating * 10) / 10,
            totalCount: statsAgg[0].totalCount,
            verifiedCount: statsAgg[0].verifiedCount,
            breakdown: {
              5: statsAgg[0].fiveStar,
              4: statsAgg[0].fourStar,
              3: statsAgg[0].threeStar,
              2: statsAgg[0].twoStar,
              1: statsAgg[0].oneStar,
            },
          }
        : {
            averageRating: 0,
            totalCount: 0,
            verifiedCount: 0,
            breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          };

    return res.status(200).json({
      success: true,
      summary,
      total: totalReviews,
      page: pageNum,
      totalPages: Math.ceil(totalReviews / limitNum) || 1,
      data: reviews,
    });
  } catch (error) {
    console.error("Get Merchant Offer Reviews Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve offer reviews.",
      error: error.message,
    });
  }
};


export const getMerchantReviewsByOfferId = async (req, res) => {
  try {
    const merchantId = req.merchant?._id;
    const { offerId } = req.params;
    const {
      page = 1,
      limit = 10,
      rating,
      verifiedOnly,
      sort = "newest",
      type,
    } = req.query;

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

    // 2. Build review query scoped to offerId, offerModel, and merchantId
    const offerObjectId = new mongoose.Types.ObjectId(offerId);
    const merchantObjectId = new mongoose.Types.ObjectId(merchantId);

    const reviewQuery = {
      offerId: offerObjectId,
      offerModel: resolvedModel,
      merchantId: merchantObjectId,
      is_deleted: false,
      approvalStatus: "approved",
    };

    if (rating && !isNaN(Number(rating))) {
      reviewQuery.rating = Number(rating);
    }

    if (verifiedOnly === "true") {
      reviewQuery.isVerifiedPurchase = true;
    }

    // Sort options: "newest" | "highest" | "lowest"
    let sortOption = { createdAt: -1 };
    if (sort === "highest") sortOption = { rating: -1, createdAt: -1 };
    if (sort === "lowest") sortOption = { rating: 1, createdAt: -1 };

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    // 3. Fetch reviews, filtered count, and full rating breakdown in parallel
    const [reviews, totalReviews, statsAgg] = await Promise.all([
      UserOfferReview.find(reviewQuery)
        .populate("userId", "name profileImage")
        .populate("shopId", "shopName city")
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .lean(),

      UserOfferReview.countDocuments(reviewQuery),

      UserOfferReview.aggregate([
        {
          $match: {
            offerId: offerObjectId,
            offerModel: resolvedModel,
            merchantId: merchantObjectId,
            is_deleted: false,
            approvalStatus: "approved",
          },
        },
        {
          $group: {
            _id: "$offerId",
            averageRating: { $avg: "$rating" },
            totalCount: { $sum: 1 },
            verifiedCount: {
              $sum: { $cond: ["$isVerifiedPurchase", 1, 0] },
            },
            fiveStar: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
            fourStar: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
            threeStar: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
            twoStar: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
            oneStar: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const summary =
      statsAgg.length > 0
        ? {
            averageRating: Math.round(statsAgg[0].averageRating * 10) / 10,
            totalCount: statsAgg[0].totalCount,
            verifiedCount: statsAgg[0].verifiedCount,
            breakdown: {
              5: statsAgg[0].fiveStar,
              4: statsAgg[0].fourStar,
              3: statsAgg[0].threeStar,
              2: statsAgg[0].twoStar,
              1: statsAgg[0].oneStar,
            },
          }
        : {
            averageRating: 0,
            totalCount: 0,
            verifiedCount: 0,
            breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          };

    return res.status(200).json({
      success: true,
      offer: {
        _id: campaign._id,
        offerModel: resolvedModel,
        title: resolvedModel === "ComboOffer" ? campaign.name : campaign.title,
        description: campaign.description,
        thumbnail:
          resolvedModel === "ComboOffer"
            ? campaign.products?.[0]?.image || null
            : campaign.thumbnail || null,
      },
      summary,
      total: totalReviews,
      page: pageNum,
      totalPages: Math.ceil(totalReviews / limitNum) || 1,
      data: reviews,
    });
  } catch (error) {
    console.error("Get Merchant Reviews By Offer ID Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve reviews for this offer.",
      error: error.message,
    });
  }
};
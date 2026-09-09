import OfferReview from "../models/offerReviewModel.js";
import Offer from "../models/offerModel.js";

/**
 * POST /api/offer-reviews
 * Merchant submits review after creating an offer
 */
export const submitOfferReview = async (req, res) => {
  try {
    const merchantId = req.merchant?._id;
    const { offerId, rating, description } = req.body;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Merchant credentials missing.",
      });
    }

    if (!offerId || !rating || !description) {
      return res.status(400).json({
        success: false,
        message: "offerId, rating, and description are required fields.",
      });
    }

    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a numeric score between 1 and 5.",
      });
    }

    // Verify target offer exists and belongs to this merchant
    const offer = await Offer.findOne({ _id: offerId, merchant_id: merchantId });
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Target offer not found or unauthorized.",
      });
    }

    // Process file uploads
    const uploadedImages = [];
    if (Array.isArray(req.files) && req.files.length > 0) {
      req.files.forEach((file) => {
        uploadedImages.push(`/uploads/offer_reviews/${file.filename}`);
      });
    }

    const review = await OfferReview.create({
      merchantId,
      offerId,
      rating: numericRating,
      description: description.trim(),
      images: uploadedImages,
    });

    return res.status(201).json({
      success: true,
      message: "Offer creation review submitted for admin review successfully.",
      data: review,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted a review for this offer creation.",
      });
    }
    console.error("Submit Offer Review Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/offer-reviews/admin
 * Admin listing of all merchant offer reviews
 */
export const getAdminOfferReviews = async (req, res) => {
  
  try {
    const { page = 1, limit = 10, status, rating } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (status) query.status = status;
    if (rating) query.rating = Number(rating);

    const [reviews, total] = await Promise.all([
      OfferReview.find(query)
        .populate("merchantId", "name phone email profileImage status")
        .populate("offerId", "title display_type start_date end_date discount_percentage discount_value")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      OfferReview.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      data: reviews,
    });
  } catch (error) {
    console.error("Get Admin Offer Reviews Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/offer-reviews/admin/:id/status
 * Admin marks review status and notes
 */
export const updateOfferReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const validStatuses = ["unread", "reviewed", "archived"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Choose from: ${validStatuses.join(", ")}`,
      });
    }

    const review = await OfferReview.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review record not found." });
    }

    if (status) review.status = status;
    if (adminNotes !== undefined) review.adminNotes = adminNotes.trim();

    await review.save();

    return res.status(200).json({
      success: true,
      message: "Review updated successfully.",
      data: review,
    });
  } catch (error) {
    console.error("Update Offer Review Status Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
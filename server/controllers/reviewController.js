import Review from "../models/ReviewModel.js";
import Product from "../models/productModel.js";
import Service from "../models/serviceModel.js";

/**
 * POST /api/reviews
 * Creates a review with uploaded photos for Product or Service
 */
export const addReview = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemType, itemId, rating, title, comment } = req.body;

    if (!itemType || !["Product", "Service"].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid itemType. Must be 'Product' or 'Service'.",
      });
    }

    if (!itemId || !rating) {
      return res.status(400).json({
        success: false,
        message: "itemId and rating are required.",
      });
    }

    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a number between 1 and 5.",
      });
    }

    // Verify target item exists and extract merchantId
    const TargetModel = itemType === "Product" ? Product : Service;
    const item = await TargetModel.findById(itemId).select("merchant_id merchantId");

    if (!item) {
      return res.status(404).json({ success: false, message: `${itemType} not found.` });
    }

    const merchantId = item.merchant_id || item.merchantId;

    // Collect file paths from Multer upload
    const uploadedImages = [];
    if (Array.isArray(req.files) && req.files.length > 0) {
      req.files.forEach((file) => {
        uploadedImages.push(`/uploads/reviews/${file.filename}`);
      });
    }

    const review = await Review.create({
      userId,
      itemType,
      itemId,
      merchantId,
      rating: numericRating,
      title: title ? title.trim() : "",
      comment: comment ? comment.trim() : "",
      images: uploadedImages,
    });

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully.",
      data: review,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted a review for this item.",
      });
    }
    console.error("Add Review Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/reviews/:itemType/:itemId
 * Fetches all reviews for a specific Product or Service
 */
export const getItemReviews = async (req, res) => {
  try {
    const { itemType, itemId } = req.params;
    const { page = 1, limit = 10, sort = "newest" } = req.query;

    if (!["Product", "Service"].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid itemType. Must be 'Product' or 'Service'.",
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    let sortOption = { createdAt: -1 };
    if (sort === "highest") sortOption = { rating: -1, createdAt: -1 };
    if (sort === "lowest") sortOption = { rating: 1, createdAt: -1 };

    const query = { itemId, itemType, status: "published", isDeleted: false };

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate("userId", "name profileImage")
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Review.countDocuments(query),
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
    console.error("Get Item Reviews Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/reviews/:reviewId/reply
 * Merchant replies to a customer review
 */
export const replyToReview = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { reviewId } = req.params;
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply comment cannot be empty.",
      });
    }

    const review = await Review.findOne({ _id: reviewId, merchantId, isDeleted: false });
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found or unauthorized." });
    }

    review.merchantReply = {
      comment: comment.trim(),
      repliedAt: new Date(),
    };

    await review.save();

    return res.status(200).json({
      success: true,
      message: "Reply added successfully.",
      data: review,
    });
  } catch (error) {
    console.error("Reply to Review Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
import express from "express";
import {
  addReview,
  getItemReviews,
  replyToReview,
} from "../controllers/reviewController.js";
import { uploadReviewImages } from "../middleware/reviewUpload.js";
import { protectUser, protectMerchant } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public: Get reviews for an item
router.get("/:itemType/:itemId", getItemReviews);

// Customer: Add review with images
router.post("/", protectUser, uploadReviewImages, addReview);

// Merchant: Reply to a review
router.post("/:reviewId/reply", protectMerchant, replyToReview);

export default router;
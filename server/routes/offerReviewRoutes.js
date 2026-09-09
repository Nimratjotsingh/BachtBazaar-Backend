import express from "express";
import {
  submitOfferReview,
  getAdminOfferReviews,
  updateOfferReviewStatus,
} from "../controllers/offerReviewController.js";
import { uploadOfferReviewImages } from "../middleware/offerReviewUpload.js";
import { protectMerchant } from "../middleware/authMiddleware.js";
// Assumes admin auth middleware exists:
import { protectSuperAdmin } from "../middleware/superAuthMiddleware.js";

const router = express.Router();

// Merchant submits review after creating an offer
router.post("/", protectMerchant, uploadOfferReviewImages, submitOfferReview);

// Admin routes
router.get("/admin", protectSuperAdmin, getAdminOfferReviews);
router.patch("/admin/:id/status", protectSuperAdmin, updateOfferReviewStatus);

export default router;
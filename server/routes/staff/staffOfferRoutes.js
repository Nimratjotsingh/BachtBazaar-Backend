import express from "express";
import {
  getOfferReviewQueue,
  getOfferDetailsAdmin,
  reviewOfferStatus,
  updateOfferThumbnailAdmin
} from "../../controllers/adminOfferReviewController.js";

import {getAdminOfferReviews,updateOfferReviewStatus} from '../../controllers/offerReviewController.js'
import { protectStaff} from "../../middleware/staffAuthMiddleware.js";
import upload from '../../middleware/uploadSec.js'

const router = express.Router();

router.use(protectStaff);

// Queue / List
router.get("/review-queue", getOfferReviewQueue);

// Detailed Inspection
router.get("/:id", getOfferDetailsAdmin);

// Review Decision (Approve / Reject / Pending)
router.patch("/:id/review", reviewOfferStatus);

router.get("/",  getAdminOfferReviews);
router.patch("/admin/:id/status", updateOfferReviewStatus);

router.patch(
  "/:id/thumbnail",
  upload.single("thumbnail"),
  updateOfferThumbnailAdmin
);

export default router;
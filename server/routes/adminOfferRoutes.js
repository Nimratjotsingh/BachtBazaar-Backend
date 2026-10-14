import express from "express";
import {
  getOfferReviewQueue,
  getOfferDetailsAdmin,
  reviewOfferStatus,
  updateOfferThumbnailAdmin
} from "../controllers/adminOfferReviewController.js";
import { protectSuperAdmin } from "../middleware/superAuthMiddleware.js";
import upload from '../middleware/uploadSec.js'

const router = express.Router();

router.use(protectSuperAdmin);

// Queue / List
router.get("/review-queue", getOfferReviewQueue);

// Detailed Inspection
router.get("/:id", getOfferDetailsAdmin);

// Review Decision (Approve / Reject / Pending)
router.patch("/:id/review", reviewOfferStatus);

router.patch(
  "/:id/thumbnail",
  upload.single("thumbnail"),
  updateOfferThumbnailAdmin
);

export default router;
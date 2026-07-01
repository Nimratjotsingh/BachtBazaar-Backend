import express from "express";
import { createBannerOffer } from "../controllers/BannerController.js";
import { protectMerchant } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadSec.js"; // Your configured file handling layer

const router = express.Router();

// Merchant Private Campaign Endpoint
router.post("/create-banner", protectMerchant, upload.single("thumbnail"), createBannerOffer);

export default router;
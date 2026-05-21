// routes/offerRoutes.js
import express from "express";
import upload from "../middleware/uploadSec.js";
import { protectMerchant } from "../middleware/authMiddleware.js";
import {
  createOffer,
  getMerchantOffers,
  getOfferDetails,
  updateOffer,
  deleteOffer,
  searchOffersByDisplayType,
  getActiveOffersForToday
} from "../controllers/offerController.js";

const router = express.Router();

router.get("/today", getActiveOffersForToday);

// Base profile actions bound to authorization layers
router.post("/", protectMerchant, upload.single("thumbnail"), createOffer);
router.get("/", protectMerchant, getMerchantOffers);
router.get("/search/:display_type", protectMerchant, searchOffersByDisplayType);

// Parametized reference routes
router.get("/:id", protectMerchant, getOfferDetails);
router.put("/:id", protectMerchant, upload.single("thumbnail"), updateOffer);
router.delete("/:id", protectMerchant, deleteOffer);

export default router;
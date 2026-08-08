import express from "express";
import {
  getExpiredOffers,
  getExpiredOfferById,
  republishOffer,
} from "../controllers/expiredOffersController.js";
import { protectMerchant } from "../middleware/authMiddleware.js";

const router = express.Router();

// Merchant routes for expired offer management
router.get("/", protectMerchant, getExpiredOffers);
router.get("/:offerId", protectMerchant, getExpiredOfferById);
router.patch("/:offerId/republish", protectMerchant, republishOffer);

export default router;
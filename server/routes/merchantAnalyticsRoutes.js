import express from "express";
import { 
  getMerchantDailyAnalytics, 
  getMerchantOffersAnalyticsBreakdown, 
  getOfferAnalytics
} from "../controllers/merchantAnalyticsController.js";
import { protectMerchant } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/merchant/analytics/dashboard?days=7
router.get("/", protectMerchant, getMerchantDailyAnalytics);

// GET /api/merchant/analytics/offers-breakdown
router.get("/offers-breakdown", protectMerchant, getMerchantOffersAnalyticsBreakdown);

router.get("/offers/:offerId", protectMerchant, getOfferAnalytics);

export default router;
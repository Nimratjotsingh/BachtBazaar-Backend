import express from "express";
import { 
  getHighestRedemptionDay,
  getMerchantDailyAnalytics, 
  getMerchantOffersAnalyticsBreakdown, 
  getOfferAnalytics,
  getTopPerformingOffers
} from "../controllers/merchantAnalyticsController.js";
import { protectMerchant } from "../middleware/authMiddleware.js";


const router = express.Router();

// GET /api/merchant/analytics/dashboard?days=7
router.get("/", protectMerchant, getMerchantDailyAnalytics);

// GET /api/merchant/analytics/offers-breakdown
router.get("/offers-breakdown", protectMerchant, getMerchantOffersAnalyticsBreakdown);

router.get('/offers/top-performing',protectMerchant, getTopPerformingOffers);

router.get('/offers/highest-redemption',protectMerchant,getHighestRedemptionDay);

router.get("/offers/:offerId", protectMerchant, getOfferAnalytics);



export default router;
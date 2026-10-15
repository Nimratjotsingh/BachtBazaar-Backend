import express from "express";
import { getMerchantShopClickAnalytics,getCombinedMerchantAnalytics } from "../controllers/shopAnalyticsController.js";
import { protectMerchant } from "../middleware/authMiddleware.js"; // Adjust to your auth middleware

const router = express.Router();

router.get("/merchant/analytics/shop-clicks", protectMerchant, getMerchantShopClickAnalytics);
router.get("/overview", protectMerchant, getCombinedMerchantAnalytics);

export default router;
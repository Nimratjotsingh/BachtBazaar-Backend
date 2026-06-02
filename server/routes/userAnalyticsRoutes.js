import express from "express";
import { getUserIntelligenceDashboard, getUserIntelligenceProfile,getMerchantIntelligenceStats } from "../controllers/userAnalyticsController.js";
import { protectSuperAdmin } from "../middleware/superAuthMiddleware.js"; // Protect with your administrative authentication walls

const router = express.Router();

// Maps directly to your React dashboard layout fetch calls
router.get("/user-intelligence", protectSuperAdmin, getUserIntelligenceDashboard);
router.get("/user-profile/:id", protectSuperAdmin, getUserIntelligenceProfile);
router.get("/merchant-intelligence", getMerchantIntelligenceStats);


export default router;
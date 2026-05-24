import express from "express";
import { 
  getAnalyticsSummary, 
  getLiveActivities, 
  getSystemLoadMetrics, 
  exportPlatformReport 
} from "../controllers/dashboardController.js";
import { protectSuperAdmin } from "../middleware/superAuthMiddleware.js"; // Security gateway verification check

const router = express.Router();

// --- BINDING PROTECTED ANALYTICS DATA STREAMS ---
router.get("/analytics-summary", protectSuperAdmin, getAnalyticsSummary);
router.get("/live-activities", protectSuperAdmin, getLiveActivities);
router.get("/system-load", protectSuperAdmin, getSystemLoadMetrics);
router.get("/export-report", protectSuperAdmin, exportPlatformReport);

export default router;
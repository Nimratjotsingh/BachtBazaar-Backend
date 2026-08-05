import express from "express";
import {
  updateUserFcmToken,
  toggleUserNotificationSettings,
  updateMerchantFcmToken,
  toggleMerchantNotificationSettings,
  sendNotification,
} from "../controllers/notificationController.js";
import { protectSuperAdmin as protectAdmin } from "../middleware/superAuthMiddleware.js";

const router = express.Router();

// ==========================================
// 1. USER NOTIFICATION ROUTES
// ==========================================




// ==========================================
// 3. ADMIN PUSH DISPATCH ROUTE
// ==========================================

// POST /api/notifications/send
router.post("/send", protectAdmin, sendNotification);

export default router;
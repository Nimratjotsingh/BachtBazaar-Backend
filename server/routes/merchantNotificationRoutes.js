import express from "express";
import {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../controllers/NotificationsController.js";
import { protectUser, protectMerchant } from "../middleware/authMiddleware.js";

const router = express.Router();



router.use(protectMerchant);

// List & Read Endpoints
router.get("/", getMyNotifications);
router.patch("/read-all", markAllNotificationsAsRead);
router.patch("/:id/read", markNotificationAsRead);
router.delete("/:id", deleteNotification);

export default router;
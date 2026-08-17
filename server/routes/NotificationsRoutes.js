import express from "express";
import {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../controllers/NotificationsController.js";
import { protectUser, protectMerchant } from "../middleware/authMiddleware.js";

const router = express.Router();

// Middleware to allow either a User or a Merchant JWT token
const protectAny = (req, res, next) => {
  protectUser(req, res, () => {
    if (req.user) return next();
    protectMerchant(req, res, next);
  });
};

router.use(protectAny);

// List & Read Endpoints
router.get("/", getMyNotifications);
router.patch("/read-all", markAllNotificationsAsRead);
router.patch("/:id/read", markNotificationAsRead);
router.delete("/:id", deleteNotification);

export default router;
import { 
  getAdminNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from "../controllers/adminNotificationsController.js";
import { Router } from "express";

import {protectSuperAdmin } from "../middleware/superAuthMiddleware.js";
const router = Router()

router.use(protectSuperAdmin)
router.get("/",  getAdminNotifications);
router.patch("/:id/read",  markNotificationAsRead);
router.patch("/mark-all-read",  markAllNotificationsAsRead);

export default router
import express from "express";
import { 
  setDailySlotLimit, 
  getCalendarScheduleAdmin, 
  checkDateAvailability,
  syncCalendarCounts
} from "../controllers/calenderConfigController.js";
import { protectSuperAdmin } from "../middleware/superAuthMiddleware.js";
import { protectMerchant } from "../middleware/authMiddleware.js";

const router = express.Router();

// --- ADMIN MANAGEMENT ENDPOINTS ---
// View full configuration schedule rule list
router.get("/admin/schedule", protectSuperAdmin, getCalendarScheduleAdmin);
// Configure/Modify limits or lock a specific date calendar entirely
router.post("/admin/limit", protectSuperAdmin, setDailySlotLimit);
// Sync check tool utility to correct slot counts if entries soft-delete
router.post("/admin/sync", protectSuperAdmin, syncCalendarCounts);

// --- SHARED / MERCHANT ENDPOINTS ---
// Used by merchants to see how many slots are remaining before picking a day
router.get("/availability",  checkDateAvailability);

export default router;
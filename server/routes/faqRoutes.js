import express from "express";
import {
  getUserFAQs,
  getMerchantFAQs,
  getFAQById,
  createFAQ,
  getAllAdminFAQs,
  updateFAQ,
  togglePublishFAQ,
  deleteFAQ,
} from "../controllers/faqController.js";
import {  protectUser, protectMerchant } from "../middleware/authMiddleware.js";
import {protectSuperAdmin as protectAdmin} from '../middleware/superAuthMiddleware.js'
const router = express.Router();

// ==========================================
// PUBLIC & APP READ ROUTES
// ==========================================
router.get("/user", getUserFAQs);
router.get("/merchant", getMerchantFAQs);
router.get("/:id", getFAQById);

// ==========================================
// ADMIN MANAGEMENT ROUTES
// ==========================================
router.post("/admin", protectAdmin, createFAQ);
router.get("/admin/all", protectAdmin, getAllAdminFAQs);
router.put("/admin/:id", protectAdmin, updateFAQ);
router.patch("/admin/:id/toggle-publish", protectAdmin, togglePublishFAQ);
router.delete("/admin/:id", protectAdmin, deleteFAQ);

export default router;
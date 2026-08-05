import express from "express";
import {
  getUserHelpArticles,
  getMerchantHelpArticles,
  getHelpArticleBySlug,
  voteHelpArticle,
  createHelpArticle,
  getAllAdminHelpArticles,
  updateHelpArticle,
  togglePublishHelpArticle,
  deleteHelpArticle,
} from "../controllers/helpArticlesController.js";
import { protectSuperAdmin as protectAdmin } from "../middleware/superAuthMiddleware.js";

const router = express.Router();

// ==========================================
// PUBLIC & APP READ ROUTES
// ==========================================
router.get("/user", getUserHelpArticles);
router.get("/merchant", getMerchantHelpArticles);
router.get("/by-slug/:slug", getHelpArticleBySlug);
router.post("/:id/vote", voteHelpArticle);

// ==========================================
// ADMIN MANAGEMENT ROUTES
// ==========================================
router.post("/admin", protectAdmin, createHelpArticle);
router.get("/admin/all", protectAdmin, getAllAdminHelpArticles);
router.put("/admin/:id", protectAdmin, updateHelpArticle);
router.patch("/admin/:id/toggle-publish", protectAdmin, togglePublishHelpArticle);
router.delete("/admin/:id", protectAdmin, deleteHelpArticle);

export default router;
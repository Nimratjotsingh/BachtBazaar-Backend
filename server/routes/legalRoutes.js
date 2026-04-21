import express from "express";
import {
  createLegal,
  getAllLegals,
  getLegalById,
  updateLegal,
  deleteLegal,
  getLegalBySlug
} from "../controllers/legalController.js";

import { protectSuperAdmin } from "../middleware/superAuthMiddleware.js";

const router = express.Router();

// 🔐 ADMIN
router.post("/", protectSuperAdmin, createLegal);
router.get("/", protectSuperAdmin, getAllLegals);
router.get("/:id", protectSuperAdmin, getLegalById);
router.put("/:id", protectSuperAdmin, updateLegal);
router.delete("/:id", protectSuperAdmin, deleteLegal);

// 🌍 PUBLIC
router.get("/slug/:slug", getLegalBySlug);

export default router;
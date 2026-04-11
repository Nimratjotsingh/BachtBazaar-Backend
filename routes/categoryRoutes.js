import express from "express";
import {
  getAllCategories,
  getCategoryById,
  addCategory,
  updateCategory,
  deleteCategory,
  hardDeleteCategory
} from "../controllers/categoryController.js";
import { protectAny, requireSuperAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get all categories
router.get("/", getAllCategories);

// Get category by ID
router.get("/:id", getCategoryById);

// Add new category
router.post("/", protectAny, requireSuperAdmin, addCategory);

// Update category
router.put("/:id", protectAny, requireSuperAdmin, updateCategory);

// Soft delete (isActive = false)
router.delete("/:id", protectAny, requireSuperAdmin, deleteCategory);

// Hard delete (permanent removal)
router.delete("/:id/permanent", protectAny, requireSuperAdmin, hardDeleteCategory);

export default router;

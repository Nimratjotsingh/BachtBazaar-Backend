import express from "express";
import {
  getAllCategories,
  getCategoryById,
  getSubcategoriesByCategory,
  addCategory,
  updateCategory,
  deleteCategory,
  hardDeleteCategory
} from "../controllers/categoryController.js";
import { protectSuperAdmin } from "../middleware/superAuthMiddleware.js";
import upload from "../middleware/uploadSec.js";

const router = express.Router();

// Get all categories
router.get("/", getAllCategories);

// Get all subcategories under a category
router.get("/:categoryId/subcategories", getSubcategoriesByCategory);

// Get category by ID
router.get("/:id", getCategoryById);

// Add new category
router.post("/", protectSuperAdmin, upload.single('image'),addCategory);

// Update category
router.put("/:id",protectSuperAdmin, upload.single('image'),updateCategory);

// Soft delete (isActive = false)
router.delete("/:id",protectSuperAdmin, deleteCategory);

// Hard delete (permanent removal)
router.delete("/:id/permanent", protectSuperAdmin, hardDeleteCategory);

export default router;

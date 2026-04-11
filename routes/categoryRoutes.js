import express from "express";
import {
  getAllCategories,
  getCategoryById,
  addCategory,
  updateCategory,
  deleteCategory,
  hardDeleteCategory
} from "../controllers/categoryController.js";

const router = express.Router();

// Get all categories
router.get("/", getAllCategories);

// Get category by ID
router.get("/:id", getCategoryById);

// Add new category
router.post("/", addCategory);

// Update category
router.put("/:id", updateCategory);

// Soft delete (isActive = false)
router.delete("/:id", deleteCategory);

// Hard delete (permanent removal)
router.delete("/:id/permanent", hardDeleteCategory);

export default router;

import express from "express";
import upload from "../middleware/uploadSec.js";
import {
  getAllSubCategories,
  getSubCategoryById,
  addSubCategory,
  updateSubCategory,
  deleteSubCategory,
  hardDeleteSubCategory
} from "../controllers/subCategoryController.js";

import {protectSuperAdmin  } from "../middleware/superAuthMiddleware.js";

const router = express.Router();

// 🔓 PUBLIC
router.get("/", getAllSubCategories);
router.get("/:id", getSubCategoryById);

// 🔐 ADMIN
router.post("/", protectSuperAdmin, upload.single("image"), addSubCategory);
router.put("/:id", protectSuperAdmin, upload.single("image"), updateSubCategory);

// delete
router.delete("/:id", protectSuperAdmin, deleteSubCategory);
router.delete("/:id/permanent", protectSuperAdmin, hardDeleteSubCategory);

export default router;
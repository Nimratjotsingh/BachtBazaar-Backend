import express from "express";
import upload from "../middleware/uploadSec.js"; // Standard directory upload setup
import { protectSuperAdmin } from "../middleware/superAuthMiddleware.js";
import {
  createTemplateImage,
  getTemplateImagesAdmin,
  updateTemplateImage,
  deleteTemplateImage
} from "../controllers/templateImageController.js";

const router = express.Router();

router.get("/admin", protectSuperAdmin, getTemplateImagesAdmin);
router.post("/admin", protectSuperAdmin, upload.single("image"), createTemplateImage);
router.put("/admin/:id", protectSuperAdmin, upload.single("image"), updateTemplateImage);
router.delete("/admin/:id", protectSuperAdmin, deleteTemplateImage);

export default router;
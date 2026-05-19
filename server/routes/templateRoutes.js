import express from "express";
import upload from "../middleware/uploadSec.js"; // Standard directory upload setup
import { protectSuperAdmin } from "../middleware/superAuthMiddleware.js";
import {
  createTemplateImage,
  getTemplateImagesAdmin,
  updateTemplateImage,
  deleteTemplateImage,
  getTemplateImagesMerchant,
  incrementTemplateUsage
} from "../controllers/templateImageController.js";
import {protectMerchant} from '../middleware/authMiddleware.js'

const router = express.Router();

router.get("/admin", protectSuperAdmin, getTemplateImagesAdmin);
router.post("/admin", protectSuperAdmin, upload.single("image"), createTemplateImage);
router.put("/admin/:id", protectSuperAdmin, upload.single("image"), updateTemplateImage);
router.delete("/admin/:id", protectSuperAdmin, deleteTemplateImage);

router.get("/discover", protectMerchant, getTemplateImagesMerchant);
router.patch("/:id/use", protectMerchant, incrementTemplateUsage);
export default router;
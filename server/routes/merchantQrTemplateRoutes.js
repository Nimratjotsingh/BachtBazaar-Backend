import express from "express";
import {
  getAvailableTemplatesForMerchant,
  getTemplatePreviewWithShopData,
} from "../controllers/qrTemplateController.js";
import { protectMerchant } from "../middleware/authMiddleware.js";

const router = express.Router();

// Enforce Merchant Authentication
router.use(protectMerchant);

// GET /api/merchant/qr-templates -> Fetch all active background templates
router.get("/", getAvailableTemplatesForMerchant);

// GET /api/merchant/qr-templates/:templateId/preview -> Get template layout bundled with merchant QR/Shop data
router.get("/:templateId/preview", getTemplatePreviewWithShopData);

export default router;
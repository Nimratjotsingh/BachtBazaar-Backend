import express from "express";
import { 
  createOfferType, 
  getOfferTypes, 
  updateOfferType, 
  deleteOfferType 
} from "../controllers/offerTypeController.js";
import { protectMerchant } from "../middleware/authMiddleware.js";
import { protectSuperAdmin } from "../middleware/superAuthMiddleware.js";
import upload from "../middleware/uploadSec.js";

const router = express.Router();

// --- MERCHANT ACCESSIBLE ROUTES ---
// Get combined admin templates + merchant custom types
router.get("/merchant", protectMerchant, getOfferTypes);
router.post("/merchant", protectMerchant, upload.single('icon'),createOfferType);
router.put("/merchant/:typeId", protectMerchant, upload.single('icon'),updateOfferType);
router.delete("/merchant/:typeId", protectMerchant, deleteOfferType);

// --- ADMIN ACCESSIBLE ROUTES ---
router.get("/admin", protectSuperAdmin, getOfferTypes);
router.post("/admin", protectSuperAdmin, upload.single('icon'),createOfferType);
router.put("/admin/:typeId", protectSuperAdmin, upload.single('icon'),updateOfferType);
router.delete("/admin/:typeId", protectSuperAdmin, deleteOfferType);

export default router;
import express from "express";
import {
  createComboOffer,
  getMerchantComboOffers,
  toggleComboOfferStatus,
  deleteComboOffer,
} from "../controllers/comboOfferController.js";
import {protectMerchant as verifyMerchant } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadSec.js";

const router = express.Router();

// --- Multer Configuration for Combo Offers ---
// Allows an optional main banner image ('banner') and up to 10 product-specific images ('product_0', 'product_1', etc.)
const comboUpload = upload.fields([
  { name: "banner", maxCount: 1 },
  { name: "product_0", maxCount: 1 },
  { name: "product_1", maxCount: 1 },
  { name: "product_2", maxCount: 1 },
  { name: "product_3", maxCount: 1 },
  { name: "product_4", maxCount: 1 },
  { name: "product_5", maxCount: 1 },
  { name: "product_6", maxCount: 1 },
  { name: "product_7", maxCount: 1 },
  { name: "product_8", maxCount: 1 },
  { name: "product_9", maxCount: 1 },
]);

// --- Merchant Combo Offer Endpoints ---
router.post("/create", verifyMerchant, comboUpload, createComboOffer);
router.get("/", verifyMerchant, getMerchantComboOffers);
router.patch("/:id/toggle-status", verifyMerchant, toggleComboOfferStatus);
router.delete("/:id", verifyMerchant, deleteComboOffer);

export default router;
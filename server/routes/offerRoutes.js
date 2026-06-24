// routes/offerRoutes.js
import express from "express";
import upload from "../middleware/uploadSec.js";
import { protectMerchant } from "../middleware/authMiddleware.js";
import {
  createOffer,
  getMerchantOffers,
  getOfferDetails,
  updateOffer,
  deleteOffer,
  searchOffersByDisplayType,
  getActiveOffersForToday,
  getAllOffersAdmin,
  getOfferDetailWithMerchantAdmin,
  revivePastOffer,
  getOffersStatsSummary,
  getMerchantSlotStatus
} from "../controllers/offerController.js";

import { protectSuperAdmin } from "../middleware/superAuthMiddleware.js";

const router = express.Router();

router.get("/today", getActiveOffersForToday);
router.get("/admin/master-list", protectSuperAdmin, getAllOffersAdmin);
router.get("/admin/detail/:id", protectSuperAdmin, getOfferDetailWithMerchantAdmin);

router.get('/merchant/slot-status',protectMerchant,getMerchantSlotStatus);
// Base profile actions bound to authorization layers
router.post("/", protectMerchant, upload.single("thumbnail"), createOffer);
router.get("/", protectMerchant, getMerchantOffers);
router.get("/search/:display_type", protectMerchant, searchOffersByDisplayType);
router.patch("/merchant/revive/:id", protectMerchant, revivePastOffer);
router.get("/stats-summary", protectSuperAdmin, getOffersStatsSummary);

// Parametized reference routes
router.get("/:id", protectMerchant, getOfferDetails);
router.put("/:id", protectMerchant, upload.single("thumbnail"), updateOffer);
router.delete("/:id", protectMerchant, deleteOffer);


export default router;
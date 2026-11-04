import express from "express";
import {
  getAdminComboOffers,
  getComboOfferDetailsAdmin,
  reviewComboOfferStatus,
  disableComboOfferAdmin,
} from "../controllers/comboOfferControllerAdmin.js";
import { protectSuperAdmin } from "../middleware/superAuthMiddleware.js"; // Ensures both admin and staff tokens are permitted

const router = express.Router();

router.use(protectSuperAdmin)

router.get("/",  getAdminComboOffers);
router.get("/:id",  getComboOfferDetailsAdmin);
router.patch("/:id/review",  reviewComboOfferStatus);
router.patch("/:id/disable",  disableComboOfferAdmin);

export default router;
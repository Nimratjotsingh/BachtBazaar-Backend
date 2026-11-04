import express from "express";
import {
  getAdminComboOffers,
  getComboOfferDetailsAdmin,
  reviewComboOfferStatus,
  disableComboOfferAdmin,
} from "../../controllers/comboOfferControllerAdmin.js";
import { protectStaff } from "../../middleware/staffAuthMiddleware.js"; // Ensures both admin and staff tokens are permitted

const router = express.Router();
router.use(protectStaff)

router.get("/",  getAdminComboOffers);
router.get("/:id",  getComboOfferDetailsAdmin);
router.patch("/:id/review",  reviewComboOfferStatus);
router.patch("/:id/disable",  disableComboOfferAdmin);

export default router;
import express from "express";
import { autofillListingDetails } from "../controllers/openaiController.js";
import { protectMerchant } from "../middleware/authMiddleware.js";

const router = express.Router();
router.post("/autofill", protectMerchant, autofillListingDetails);

export default router;
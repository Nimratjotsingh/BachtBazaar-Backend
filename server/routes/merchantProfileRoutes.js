import express from "express";
import upload from "../middleware/upload.js";
import { protectMerchant } from "../middleware/authMiddleware.js";
import { updateMerchantProfile } from "../controllers/merchantProfileController.js";

const router = express.Router();

router.put("/", protectMerchant, upload.single("profileImage"), updateMerchantProfile);

export default router;

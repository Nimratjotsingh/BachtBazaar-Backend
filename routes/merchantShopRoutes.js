import express from "express";
import upload from "../middleware/upload.js";
import { protectMerchant } from "../middleware/authMiddleware.js";
import { upsertShopProfile, getOpeningHours, updateOpeningHours, updateDayHours } from "../controllers/merchantShopController.js";

const router = express.Router();

router.put(
  "/",
  protectMerchant,
  upload.fields([
    { name: "logoImage", maxCount: 1 },
    { name: "shopBannerImage", maxCount: 1 }
  ]),
  upsertShopProfile
);

// Opening hours routes
router.get("/hours", protectMerchant, getOpeningHours);
router.put("/hours", protectMerchant, updateOpeningHours);
router.patch("/hours/:day", protectMerchant, updateDayHours);

export default router;

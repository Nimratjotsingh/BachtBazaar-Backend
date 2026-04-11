import express from "express";
import upload from "../middleware/upload.js";
import { protectMerchant } from "../middleware/authMiddleware.js";
import { upsertShopProfile } from "../controllers/merchantShopController.js";

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

export default router;

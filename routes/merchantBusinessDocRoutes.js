import express from "express";
import upload from "../middleware/upload.js";
import { protectMerchant } from "../middleware/authMiddleware.js";
import { upsertBusinessDocs } from "../controllers/merchantBusinessDocController.js";

const router = express.Router();

router.post(
  "/",
  protectMerchant,
  upload.fields([
    { name: "gstImage", maxCount: 1 },
    { name: "tradeLicenseImage", maxCount: 1 },
    { name: "shopRegistrationImage", maxCount: 1 },
    { name: "fssaiImage", maxCount: 1 }
  ]),
  upsertBusinessDocs
);

export default router;

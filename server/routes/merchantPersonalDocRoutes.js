import express from "express";
import upload from "../middleware/upload.js";
import { protectMerchant } from "../middleware/authMiddleware.js";
import { upsertPersonalDocs } from "../controllers/merchantPersonalDocController.js";

const router = express.Router();

router.post(
  "/",
  protectMerchant,
  upload.fields([
    { name: "aadharImage", maxCount: 1 },
    { name: "panImage", maxCount: 1 }
  ]),
  upsertPersonalDocs
);

export default router;

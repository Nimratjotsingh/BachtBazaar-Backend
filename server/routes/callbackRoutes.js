import express from "express";
import {
  createUserCallback,
  createMerchantCallback,
} from "../controllers/callBackController.js";
import { protectUser, protectMerchant } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/user", protectUser, createUserCallback);
router.post("/merchant", protectMerchant, createMerchantCallback);

export default router;
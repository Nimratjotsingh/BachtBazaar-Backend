import express from "express";
import {
  getMyReferralCode,
  getMyReferralsList,
} from "../controllers/referralController.js";
import { protectUser } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protectUser);

// GET /api/user/referrals/my-code
router.get("/my-code", getMyReferralCode);

// GET /api/user/referrals/list
router.get("/list", getMyReferralsList);

export default router;
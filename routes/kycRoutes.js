import express from "express";
import {
  verifyPan,
  initiateAadhaarOtp,
  verifyAadhaarOtp
} from "../controllers/kycController.js";
import { protectMerchant } from "../middleware/authMiddleware.js";

const router = express.Router();

// PAN Verification
// POST /api/kyc/pan
// Body: { pan, name }
router.post("/pan", protectMerchant, verifyPan);

// Aadhaar – Step 1: send OTP to registered mobile
// POST /api/kyc/aadhaar/initiate
// Body: { aadhaarNumber }
router.post("/aadhaar/initiate", protectMerchant, initiateAadhaarOtp);

// Aadhaar – Step 2: verify OTP
// POST /api/kyc/aadhaar/verify
// Body: { refId, otp }
router.post("/aadhaar/verify", protectMerchant, verifyAadhaarOtp);

export default router;

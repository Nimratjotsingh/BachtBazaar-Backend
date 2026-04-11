import express from "express";
import {
  sendOtp,
  verifyOtp,
  setPassword,
  loginWithPassword,
  loginWithOtp,
  forgotPassword,
  updatePassword
} from "../controllers/merchantAuthController.js";
import { protectMerchant } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/set-password", protectMerchant, setPassword);
router.post("/login-password", loginWithPassword);
router.post("/login-otp", loginWithOtp);
router.post("/forgot-password", forgotPassword);
router.put("/password", protectMerchant, updatePassword);

export default router;

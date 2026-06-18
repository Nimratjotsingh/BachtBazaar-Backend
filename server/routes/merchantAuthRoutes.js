import express from "express";
import {
  registerMerchantSendOtp,
  registerMerchantVerifyOtp,
  sendOtp,
  verifyOtp,
  setPassword,
  loginWithPassword,
  loginWithOtp,
  forgotPassword,
  updatePassword,
  createTestMerchant,
  tempUpdatePass,
  logoutMerchant
} from "../controllers/merchantAuthController.js";
import { protectMerchant } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register/send-otp", registerMerchantSendOtp);
router.post("/register/verify-otp", registerMerchantVerifyOtp);
router.post('/register/test',createTestMerchant)
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/set-password", protectMerchant, setPassword);
router.post("/login-password", loginWithPassword);
router.post("/login-otp", loginWithOtp);
router.post("/forgot-password", forgotPassword);
router.post("/temp-change-pass",tempUpdatePass);
router.put("/password", protectMerchant, updatePassword);
router.post("/merchant/auth/logout", protectMerchant, logoutMerchant);

export default router;

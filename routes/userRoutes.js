import express from "express";
import {
updateProfile,
sendOtp,
verifyOtp,
setPassword,
loginWithPassword,
loginWithOtp,
forgotPassword,
updatePassword
} from "../controllers/userController.js";
import { getProfileImage } from "../controllers/userController.js";

import upload from "../middleware/upload.js";
import { protectUser } from "../middleware/authMiddleware.js";


const router = express.Router();

// auth
router.post("/auth/send-otp", sendOtp);
router.post("/auth/verify-otp", verifyOtp);
router.post("/auth/set-password", protectUser, setPassword);
router.post("/auth/login-password", loginWithPassword);
router.post("/auth/login-otp", loginWithOtp);
router.post("/auth/forgot-password", forgotPassword);

// user
router.put("/profile", protectUser, upload.single("profileImage"), updateProfile);
router.put("/password", protectUser, updatePassword);
router.get("/profile-image", protectUser, getProfileImage);

export default router;




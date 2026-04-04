import express from "express";
import {
updateProfile,
sendOtp,
verifyOtp,
setPassword,
loginWithPassword,
loginWithOtp,
} from "../controllers/userController.js";

import upload from "../middleware/upload.js";
import { protectUser } from "../middleware/authMiddleware.js";


const router = express.Router();

router.post("/auth/send-otp",sendOtp);
router.post("/auth/verify-otp",verifyOtp);
router.post("/auth/set-password",setPassword);
router.post("/auth/login-password",loginWithPassword);
router.post("/auth/login-otp",loginWithOtp);
router.put("/update-profile",protectUser, upload.single("profileImage"), updateProfile);

export default router;




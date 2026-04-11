import express from "express";
import {
    sendOtp,
    verifyOtp,
    setPassword,
    loginWithPassword,
    loginWithOtp,
    uploadDocuments,
    updateProfile,
    uploadBusinessDocuments,
    updateShopProfile
} from "../controllers/merchantController.js";

import { protectMerchant } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";



const router = express.Router();

router.post("/auth/send-otp", sendOtp);
router.post("/auth/verify-otp", verifyOtp);
router.post("/auth/set-password", protectMerchant, setPassword);
router.post("/auth/login-password", loginWithPassword);
router.post("/auth/login-otp", loginWithOtp);
router.put("/update-profile", protectMerchant, upload.single("profileImage"), updateProfile);

router.post("/upload-documents", protectMerchant, upload.fields([
    { name: "aadharImage", maxCount: 1 },
    { name: "panImage", maxCount: 1 }
]), uploadDocuments);


router.post("/upload-business-documents", protectMerchant, upload.fields([
    { name: "gstImage", maxCount: 1 },
    { name: "tradeLicenseImage", maxCount: 1 },
    { name: "shopRegistrationImage", maxCount: 1 },
    { name: "fssaiImage", maxCount: 1 },

]), uploadBusinessDocuments);


router.post("/update-shop-profile",protectMerchant,upload.fields([
    { name:"logoImage", maxCount:1 },
    { name:"shopBannerImage", maxCount:1 }

]), updateShopProfile)




export default router;




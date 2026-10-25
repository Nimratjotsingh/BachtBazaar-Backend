import express from "express";
import { protectAny, protectMerchant, protectUser } from "../middleware/authMiddleware.js";
import { getProfileUser,getProfileMerchant,updateMerchantProfile } from "../controllers/profileController.js";

const router = express.Router();

router.get("/user", protectUser, getProfileUser);
router.get("/merchant", protectMerchant,getProfileMerchant);
router.put("/merchant", protectMerchant,updateMerchantProfile);

export default router;

import express from "express";
import { 
  createBanner, 
  getAllBannersAdmin, 
  updateBanner, 
  deleteBanner, 
  getActiveUserBanners 
} from "../controllers/adminBannerModel.js";
import  upload  from "../middleware/uploadSec.js"; // Standard multer configurations parsing single disk engine paths
import {protectSuperAdmin} from '../middleware/superAuthMiddleware.js'
const router = express.Router();

// --- Customer-Facing Stream Endpoints ---
router.get("/active-feed", getActiveUserBanners);

// --- Administrative CRUD Middleware Operations Slots ---
router.get("/admin-list",protectSuperAdmin, getAllBannersAdmin);
router.post("/create", protectSuperAdmin, upload.single("image"), createBanner);
router.put("/update/:id", protectSuperAdmin, upload.single("image"), updateBanner);
router.delete("/delete/:id", protectSuperAdmin, deleteBanner);

export default router;
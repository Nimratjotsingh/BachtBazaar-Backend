import express from "express";
import {
  createBannerType,
  getAllBannerTypes,
  getBannerTypeById,
  updateBannerType,
  deleteBannerType
} from "../controllers/BannerTypeController.js";

import upload from '../middleware/uploadSec.js'
import {protectSuperAdmin} from '../middleware/superAuthMiddleware.js';

const router = express.Router();

// Public / Protected Admin endpoints mapping
router.route("/")
  .post(protectSuperAdmin,upload.single('img'),createBannerType)
  .get(getAllBannerTypes);

router.route("/:id")
  .get(getBannerTypeById)
  .put(protectSuperAdmin,upload.single('img'),updateBannerType)
  .delete(protectSuperAdmin,deleteBannerType);

export default router;
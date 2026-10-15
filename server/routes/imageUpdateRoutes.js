import express from "express";
import { updateEntityImage } from "../controllers/imageUpdateController.js";
import { protectSuperAdmin } from "../middleware/superAuthMiddleware.js";
import upload from "../middleware/uploadSec.js"; // Your multer config

const router = express.Router();

router.patch("/:entityId/image", protectSuperAdmin, upload.single("image"), updateEntityImage);

export default router;
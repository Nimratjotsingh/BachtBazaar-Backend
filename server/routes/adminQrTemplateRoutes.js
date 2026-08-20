import express from "express";
import {
  createQrTemplate,
  getAllQrTemplatesAdmin,
  updateQrTemplate,
  deleteQrTemplate,
} from "../controllers/qrTemplateController.js";
import upload from "../middleware/uploadSec.js"; // Adjust import path to your multer file
import { protectSuperAdmin as protectAdmin } from "../middleware/superAuthMiddleware.js";

const router = express.Router();

// Enforce Admin Authentication
router.use(protectAdmin);

// Multer fields configuration for local uploads
const qrTemplateUpload = upload.fields([
  { name: "templateImage", maxCount: 1 },
  { name: "previewThumbnail", maxCount: 1 },
]);

router.post("/", qrTemplateUpload, createQrTemplate);
router.get("/", getAllQrTemplatesAdmin);
router.patch("/:id", qrTemplateUpload, updateQrTemplate);
router.delete("/:id", deleteQrTemplate);

export default router;
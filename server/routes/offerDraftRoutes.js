import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  saveOfferDraft,
  updateOfferDraft,
  getMerchantOfferDrafts,
  publishOfferDraft,
  discardOfferDraft,
} from "../controllers/offerDraftController.js";
import { protectMerchant } from "../middleware/authMiddleware.js";

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "../public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Disk Storage Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `draft-${uniqueSuffix}${ext}`);
  },
});

const rawMulter = multer({ storage });

/**
 * Safe Multer Middleware: Catches 'Field name missing' or 'Unexpected field' errors gracefully
 */
const safeUpload = (req, res, next) => {
  rawMulter.any()(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.warn(`⚠️ Multer Upload Warning [${err.code}]: ${err.message}. Proceeding without file.`);
      // Continue execution even if file key name was malformed
      return next();
    } else if (err) {
      console.error("Multer Middleware Error:", err);
      return res.status(500).json({
        success: false,
        message: "File processing failed.",
        error: err.message,
      });
    }
    next();
  });
};

// ==========================================
// MERCHANT DRAFT ROUTES
// ==========================================

// GET all drafts
router.get("/", protectMerchant, getMerchantOfferDrafts);

// POST save initial draft
router.post("/", protectMerchant, safeUpload, saveOfferDraft);

// PUT update existing draft
router.put("/:draftId", protectMerchant, safeUpload, updateOfferDraft);

// POST publish draft to live offer
router.post("/:draftId/publish", protectMerchant, publishOfferDraft);

// DELETE discard draft
router.delete("/draft/:draftId", protectMerchant, discardOfferDraft);

export default router;
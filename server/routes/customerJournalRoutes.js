import express from "express";
import {
  createJournalEntry,
  getJournalEntries,
  getJournalEntryById,
  updateJournalEntry,
  deleteJournalEntry,
} from "../controllers/customerJournalController.js";
import  uploadJournalMedia  from "../middleware/journalMediaUpload.js";
import { protectMerchant } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protectMerchant);

// Create entry (Supports multipart/form-data for image & voiceNote uploads)
router.post("/", uploadJournalMedia,createJournalEntry);

// Query journal list with filters and financial breakdown summary
router.get("/", getJournalEntries);

// Single entry operations
router.get("/:id", getJournalEntryById);
router.patch("/:id",  uploadJournalMedia,updateJournalEntry);
router.delete("/:id", deleteJournalEntry);

export default router;
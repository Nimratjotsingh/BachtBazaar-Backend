import express from "express";
import {
  createSuggestion,
  listSuggestions,
  getSuggestionDetails,
  updateSuggestion,
  deleteSuggestion,
} from "../../controllers/adminServiceSuggestionController.js";
import upload from "../../middleware/uploadSec.js";
import { protectStaff } from "../../middleware/staffAuthMiddleware.js";

const router = express.Router();

// Apply admin authentication to all routes in this router
router.use(protectStaff);

router.post("/", upload.single("image"), createSuggestion);
router.get("/", listSuggestions);
router.get("/:id", getSuggestionDetails);
router.put("/:id", upload.single("image"), updateSuggestion);
router.delete("/:id", deleteSuggestion);

export default router;
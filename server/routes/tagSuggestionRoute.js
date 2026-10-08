import express from "express";
import { getTagSuggestionsForProduct } from "../controllers/tagSuggestionController.js";

const router = express.Router();

// Supports:
// GET /api/tags/suggestions?category_id=64f...&subcategory_id=64e...&q=cot
// POST /api/tags/suggestions with { category_id: [...], subcategory_id: [...], q: "cot" }
router.route("/")
  .get(getTagSuggestionsForProduct)
  .post(getTagSuggestionsForProduct);

export default router;
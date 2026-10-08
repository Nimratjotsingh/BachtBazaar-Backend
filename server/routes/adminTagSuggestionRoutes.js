import express from "express";
import {
  createTagSuggestion,
  getAllTagSuggestions,
  getTagSuggestionById,
  updateTagSuggestion,
  modifyTagsInRule,
  deleteTagSuggestion,
} from "../controllers/tagSuggestionController.js";

const router = express.Router();

router.route("/")
  .post(createTagSuggestion)
  .get(getAllTagSuggestions);

router.route("/:id")
  .get(getTagSuggestionById)
  .put(updateTagSuggestion)
  .delete(deleteTagSuggestion);

router.patch("/:id/tags", modifyTagsInRule);

export default router;
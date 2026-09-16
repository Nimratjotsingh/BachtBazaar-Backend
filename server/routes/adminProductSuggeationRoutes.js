import express from "express";
import {
  createProductSuggestion,
  getAllProductSuggestions,
  getProductSuggestionById,
  updateProductSuggestion,
  toggleProductSuggestionStatus,
  deleteProductSuggestion,
} from "../controllers/adminProductSuggestionController.js";
import {protectSuperAdmin as protectAdmin } from "../middleware/superAuthMiddleware.js";
import upload from "../middleware/uploadSec.js";

const router = express.Router();

// Guard all endpoints under admin protection
router.use(protectAdmin);

router
  .route("/")
  .post(
    upload.fields([
      { name: "thumbnail", maxCount: 1 },
      { name: "images", maxCount: 10 },
    ]),
    createProductSuggestion
  )
  .get(getAllProductSuggestions);

router
  .route("/:id")
  .get(getProductSuggestionById)
  .put(
    upload.fields([
      { name: "thumbnail", maxCount: 1 },
      { name: "images", maxCount: 10 },
    ]),
    updateProductSuggestion
  )
  .delete(deleteProductSuggestion);

router.patch("/:id/toggle-status", toggleProductSuggestionStatus);

export default router;
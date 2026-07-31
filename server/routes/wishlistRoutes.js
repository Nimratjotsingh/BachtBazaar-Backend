import express from "express";
import {
  toggleOfferWishlist,
  getUserWishlist,
  removeFromWishlist,
  clearWishlist,
} from "../controllers/wishlistController.js";
import { protectUser } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/:offerId", protectUser, toggleOfferWishlist);
router.get("/", protectUser, getUserWishlist);
router.delete("/remove/:offerId", protectUser, removeFromWishlist);
router.delete("/clear", protectUser, clearWishlist);

export default router;
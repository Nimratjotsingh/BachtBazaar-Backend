import express from "express";
import {
  toggleWishlistItem,
  getUserWishlist,
  clearWishlistSection,
  removeItemFromWishlist
} from "../controllers/wishlistController.js";
import { protectUser } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/:type/:itemId", protectUser, toggleWishlistItem);
router.get("/", protectUser, getUserWishlist);
router.delete("/remove/:type/:itemId", protectUser, removeItemFromWishlist);
router.delete("/clear", protectUser, clearWishlistSection);

export default router;
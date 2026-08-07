import express from "express";
import {
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  applyCoupon,
  removeCoupon,
} from "../controllers/CartController.js";
import { protectUser } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protectUser); // All cart routes require user authentication

router.get("/", getCart);
router.post("/add", addToCart);
router.patch("/item/:itemId", updateCartItemQuantity);
router.delete("/item/:itemId", removeCartItem);
router.delete("/clear", clearCart);

// Coupon management
router.post("/coupon", applyCoupon);
router.delete("/coupon", removeCoupon);

export default router;
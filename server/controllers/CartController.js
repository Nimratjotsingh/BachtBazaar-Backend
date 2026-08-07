import Cart from "../models/cartModel.js";
import Product from "../models/productModel.js";
import Offer from "../models/offerModel.js";

// ==========================================
// 1. GET USER CART
// ==========================================

/**
 * GET /api/cart
 * Retrieve current active cart for the authenticated user
 */
export const getCart = async (req, res) => {
  try {
    const userId = req.user._id;

    let cart = await Cart.findOne({ user_id: userId })
      .populate("items.product_id", "title name price discount_price thumbnail status is_deleted")
      .populate("items.merchant_id", "name shop_name status");

    if (!cart) {
      cart = await Cart.create({ user_id: userId, items: [] });
    }

    return res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    console.error("Get Cart Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve cart.",
      error: error.message,
    });
  }
};

// ==========================================
// 2. ADD TO CART (SUPPORTS MULTIPLE PRODUCTS)
// ==========================================

/**
 * POST /api/cart/add
 * Add single or multiple products/items to cart
 * Body accepts: { productId, quantity, variantInfo, merchantId } or array of items: { items: [...] }
 */
export const addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { items, productId, quantity = 1, variantInfo = "", merchantId } = req.body;

    // Standardize incoming payload into an array for multi-item support
    let itemsToAdd = [];

    if (Array.isArray(items) && items.length > 0) {
      itemsToAdd = items;
    } else if (productId) {
      itemsToAdd = [{ productId, quantity, variantInfo, merchantId }];
    } else {
      return res.status(400).json({
        success: false,
        message: "At least one product (productId) must be provided.",
      });
    }

    // Find or create user cart
    let cart = await Cart.findOne({ user_id: userId });
    if (!cart) {
      cart = new Cart({ user_id: userId, items: [] });
    }

    // Process each item in payload
    for (const itemPayload of itemsToAdd) {
      const targetProductId = itemPayload.productId || itemPayload.product_id;
      const itemQty = Math.max(1, Number(itemPayload.quantity) || 1);
      const variant = itemPayload.variantInfo || itemPayload.variant_info || "";

      // Validate product existence
      const product = await Product.findById(targetProductId);
      if (!product || product.is_deleted) {
        continue; // Skip invalid products
      }

      const effectiveMerchantId = itemPayload.merchantId || itemPayload.merchant_id || product.merchant_id;
      if (!effectiveMerchantId) {
        continue;
      }

      const unitPrice = Number(product.discount_price || product.price) || 0;
      const productName = product.title || product.name || "Product";
      const productThumbnail = product.thumbnail || product.image || "";

      // Check if product with exact same variant is already in cart
      const existingItemIndex = cart.items.findIndex(
        (i) =>
          i.product_id.toString() === targetProductId.toString() &&
          i.variant_info === variant
      );

      if (existingItemIndex > -1) {
        // Increment quantity
        cart.items[existingItemIndex].quantity += itemQty;
        cart.items[existingItemIndex].unit_price = unitPrice;
      } else {
        // Push new product item
        cart.items.push({
          product_id: targetProductId,
          merchant_id: effectiveMerchantId,
          product_name: productName,
          product_thumbnail: productThumbnail,
          variant_info: variant,
          unit_price: unitPrice,
          quantity: itemQty,
          item_total: unitPrice * itemQty,
        });
      }
    }

    // Trigger pre-save middleware to recalculate total amounts and item counts
    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Cart updated successfully.",
      data: cart,
    });
  } catch (error) {
    console.error("Add To Cart Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add items to cart.",
      error: error.message,
    });
  }
};

// ==========================================
// 3. UPDATE ITEM QUANTITY
// ==========================================

/**
 * PATCH /api/cart/item/:itemId
 * Update quantity for a specific item in the cart
 * Body: { quantity: number }
 */
export const updateCartItemQuantity = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    const newQty = Number(quantity);
    if (isNaN(newQty)) {
      return res.status(400).json({
        success: false,
        message: "Valid numeric quantity is required.",
      });
    }

    const cart = await Cart.findOne({ user_id: userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found." });
    }

    const itemIndex = cart.items.findIndex((i) => i._id.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: "Item not found in cart." });
    }

    if (newQty <= 0) {
      // If quantity is 0 or less, remove item from array
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = newQty;
    }

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Cart item quantity updated.",
      data: cart,
    });
  } catch (error) {
    console.error("Update Cart Quantity Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update item quantity.",
      error: error.message,
    });
  }
};

// ==========================================
// 4. REMOVE ITEM FROM CART
// ==========================================

/**
 * DELETE /api/cart/item/:itemId
 * Remove a single product item from the user's cart
 */
export const removeCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user_id: userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found." });
    }

    cart.items = cart.items.filter((i) => i._id.toString() !== itemId);

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Item removed from cart.",
      data: cart,
    });
  } catch (error) {
    console.error("Remove Cart Item Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove item from cart.",
      error: error.message,
    });
  }
};

// ==========================================
// 5. CLEAR ENTIRE CART
// ==========================================

/**
 * DELETE /api/cart/clear
 * Clear all items and reset discount coupons from user's cart
 */
export const clearCart = async (req, res) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ user_id: userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found." });
    }

    cart.items = [];
    cart.applied_coupon = {
      coupon_code: "",
      offer_id: null,
      discount_amount: 0,
    };

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Cart cleared successfully.",
      data: cart,
    });
  } catch (error) {
    console.error("Clear Cart Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to clear cart.",
      error: error.message,
    });
  }
};

// ==========================================
// 6. APPLY & REMOVE COUPON
// ==========================================

/**
 * POST /api/cart/coupon
 * Apply offer code or coupon discount to entire cart
 */
export const applyCoupon = async (req, res) => {
  try {
    const userId = req.user._id;
    const { offerId, couponCode } = req.body;

    if (!offerId && !couponCode) {
      return res.status(400).json({
        success: false,
        message: "Offer ID or Coupon Code is required.",
      });
    }

    const cart = await Cart.findOne({ user_id: userId });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot apply coupon to an empty cart.",
      });
    }

    // Find Offer in database
    const query = offerId ? { _id: offerId } : { title: couponCode };
    const offer = await Offer.findOne({ ...query, is_active: true, is_deleted: false });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired coupon code.",
      });
    }

    // Check expiration date
    if (offer.end_date && new Date(offer.end_date) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "This offer coupon has expired.",
      });
    }

    // Check minimum purchase limit
    if (offer.minimum_purchase_amount && cart.subtotal < offer.minimum_purchase_amount) {
      return res.status(400).json({
        success: false,
        message: `Cart subtotal must be at least ₹${offer.minimum_purchase_amount} to use this coupon.`,
      });
    }

    // Calculate discount value
    let computedDiscount = 0;
    if (offer.discount_percentage) {
      computedDiscount = (cart.subtotal * offer.discount_percentage) / 100;
    } else if (offer.discount_value) {
      computedDiscount = offer.discount_value;
    }

    cart.applied_coupon = {
      coupon_code: couponCode || offer.title || "PROMO",
      offer_id: offer._id,
      discount_amount: Math.min(computedDiscount, cart.subtotal),
    };

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Coupon applied successfully!",
      data: cart,
    });
  } catch (error) {
    console.error("Apply Coupon Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to apply coupon.",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/cart/coupon
 * Remove applied coupon from user's cart
 */
export const removeCoupon = async (req, res) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ user_id: userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found." });
    }

    cart.applied_coupon = {
      coupon_code: "",
      offer_id: null,
      discount_amount: 0,
    };

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Coupon removed successfully.",
      data: cart,
    });
  } catch (error) {
    console.error("Remove Coupon Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove coupon.",
      error: error.message,
    });
  }
};
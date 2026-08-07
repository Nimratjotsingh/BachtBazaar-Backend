import mongoose from "mongoose";

// Schema for individual items within the cart
const cartItemSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required."],
      index: true,
    },
    merchant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: [true, "Merchant ID is required."],
      index: true,
    },
    // Snapshot of product metadata at time of addition
    product_name: {
      type: String,
      required: true,
      trim: true,
    },
    product_thumbnail: {
      type: String,
      default: "",
    },
    variant_info: {
      type: String,
      default: "", // e.g., "Size: M, Color: Blue"
      trim: true,
    },
    unit_price: {
      type: Number,
      required: [true, "Unit price is required."],
      min: [0, "Unit price cannot be negative."],
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: [1, "Quantity must be at least 1."],
    },
    // Item-level offer/discount tracking
    offer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
      default: null,
    },
    item_discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative."],
    },
    // Computed price: (unit_price * quantity) - item_discount
    item_total: {
      type: Number,
      required: true,
      min: [0, "Item total cannot be negative."],
    },
  },
  { _id: true, timestamps: true }
);

// Main User Cart Schema
const cartSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required."],
      unique: true, // One active cart document per user
      index: true,
    },
    // Array supporting multiple product items in the cart
    items: [cartItemSchema],

    // Cart-wide applied promo code or offer
    applied_coupon: {
      coupon_code: { type: String, default: "" },
      offer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Offer",
        default: null,
      },
      discount_amount: { type: Number, default: 0 },
    },

    // Cart Financial Summary
    subtotal: {
      type: Number,
      default: 0,
      min: [0, "Subtotal cannot be negative."],
    },
    total_discount: {
      type: Number,
      default: 0,
      min: [0, "Total discount cannot be negative."],
    },
    total_amount: {
      type: Number,
      default: 0,
      min: [0, "Total amount cannot be negative."],
    },
    total_items_count: {
      type: Number,
      default: 0,
      min: [0, "Total items count cannot be negative."],
    },
    total_unique_products: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save Middleware: Recalculates subtotal, discounts, item counts, and totals across all array items without using next()
cartSchema.pre("save", async function () {
  let computedSubtotal = 0;
  let computedItemDiscounts = 0;
  let totalQuantity = 0;

  this.items.forEach((item) => {
    const rawTotal = item.unit_price * item.quantity;
    const discount = item.item_discount || 0;

    item.item_total = Math.max(0, rawTotal - discount);

    computedSubtotal += rawTotal;
    computedItemDiscounts += discount;
    totalQuantity += item.quantity;
  });

  const cartCouponDiscount = this.applied_coupon?.discount_amount || 0;

  this.subtotal = computedSubtotal;
  this.total_discount = computedItemDiscounts + cartCouponDiscount;
  this.total_items_count = totalQuantity;
  this.total_unique_products = this.items.length;

  // Final payable total after applying all item and coupon discounts
  this.total_amount = Math.max(0, computedSubtotal - this.total_discount);
});

const Cart = mongoose.models.Cart || mongoose.model("Cart", cartSchema);

export default Cart;
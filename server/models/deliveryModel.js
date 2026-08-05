import mongoose from "mongoose";

const deliveryOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      index: true,
    },

    // --- PRODUCT / ITEM DETAILS ---
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
      index: true,
    },
    productDetails: {
      productName: { type: String, required: true },
      quantity: { type: Number, required: true, default: 1, min: 1 },
      unitPrice: { type: Number, required: true, min: 0 },
      productThumbnail: { type: String, default: "" },
      variantInfo: { type: String, default: "" }, // e.g., "Color: Red, Size: XL"
    },

    // User Delivery Address Snapshot
    deliveryAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String },
      zipCode: { type: String },
      landmark: { type: String, default: "" },
    },
    // User Contact Phone Snapshot
    contactPhone: {
      type: String,
      required: [true, "Contact phone number is required."],
    },
    // Optional delivery instructions / notes from user
    note: {
      type: String,
      trim: true,
      default: "",
    },

    // Financial Breakdown
    itemPrice: {
      type: Number,
      required: [true, "Total item price is required."],
      min: [0, "Item price cannot be negative."],
    },
    deliveryFee: {
      type: Number,
      required: true,
      default: 0,
    },
    platformFee: {
      type: Number,
      required: true,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },

    // Order Lifecycle Status
    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "declined",
        "canceled_by_user",
        "dispatched",
        "delivered",
      ],
      default: "pending",
      index: true,
    },
    declineReason: {
      type: String,
      default: null,
    },
    cancelReason: {
      type: String,
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid_cash_on_delivery", "paid_merchant_qr", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Auto-generate order number before validation
deliveryOrderSchema.pre("validate", async function () {
  if (!this.orderNumber) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    this.orderNumber = `DEL-${randomDigits}`;
  }
});

const DeliveryOrder =
  mongoose.models.DeliveryOrder ||
  mongoose.model("DeliveryOrder", deliveryOrderSchema);

export default DeliveryOrder;
import mongoose from "mongoose";

// Sub-schema for individual items within a delivery order
const deliveryOrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
      index: true,
    },
    productName: {
      type: String,
      required: [true, "Product name is required."],
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: [1, "Quantity must be at least 1."],
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, "Unit price cannot be negative."],
    },
    productThumbnail: {
      type: String,
      default: "",
    },
    variantInfo: {
      type: String,
      default: "", // e.g., "Color: Red, Size: XL"
      trim: true,
    },
    itemTotal: {
      type: Number,
      required: true,
      min: [0, "Item total cannot be negative."],
    },
  },
  { _id: true }
);

// Main Delivery Order Schema
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

    // --- MULTIPLE PRODUCTS / ITEMS ARRAY ---
    items: {
      type: [deliveryOrderItemSchema],
      validate: [
        (val) => val.length > 0,
        "At least one item is required in a delivery order.",
      ],
    },

    // User Delivery Address Snapshot
    deliveryAddress: {
      street: { type: String },
      city: { type: String },
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
      
    },

    // --- ESTIMATED DELIVERY TIME ---
    estimatedDeliveryTime: {
      value: {
        type: Number,
        default: 30, // Default 30 mins, or set by merchant upon order acceptance
        min: [1, "Estimated time value must be at least 1."],
      },
      unit: {
        type: String,
        enum: ["minutes", "hours", "days"],
        default: "minutes",
      },
    },
    expectedDeliveryAt: {
      type: Date,
      default: null, // Dynamic timestamp calculated when order status becomes 'accepted' or 'dispatched'
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

// Auto-calculate item sub-totals, sum itemPrice, and totalAmount
deliveryOrderSchema.pre("save", async function () {
  if (this.items && this.items.length > 0) {
    let calculatedItemPrice = 0;

    this.items.forEach((item) => {
      item.itemTotal = item.unitPrice * item.quantity;
      calculatedItemPrice += item.itemTotal;
    });

    this.itemPrice = calculatedItemPrice;
    this.totalAmount =
      calculatedItemPrice + (this.deliveryFee || 0) + (this.platformFee || 0);
  }
});

const DeliveryOrder =
  mongoose.models.DeliveryOrder ||
  mongoose.model("DeliveryOrder", deliveryOrderSchema);

export default DeliveryOrder;
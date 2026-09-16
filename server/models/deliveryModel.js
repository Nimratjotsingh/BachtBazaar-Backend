import mongoose from "mongoose";

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
      default: "",
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

    items: {
      type: [deliveryOrderItemSchema],
      validate: [
        (val) => val.length > 0,
        "At least one item is required in a delivery order.",
      ],
    },

    deliveryAddress: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zipCode: { type: String },
      landmark: { type: String, default: "" },
      latitude: { type: Number },
      longitude: { type: Number },
    },
    contactPhone: {
      type: String,
      required: [true, "Contact phone number is required."],
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },

    // --- FINANCIAL AUDIT BREAKDOWN ---
    itemPrice: {
      type: Number,
      min: [0, "Item price cannot be negative."],
    },
    distanceKm: {
      type: Number,
      default: 1,
      min: 0,
    },
    deliveryFeeBreakdown: {
      appliedRatePerKm: { type: Number, default: 0 },
      baseFee: { type: Number, default: 0 },
      surcharge: { type: Number, default: 0 },
      tierApplied: {
        type: String,
        enum: ["STANDARD", "NIGHT", "PEAK"],
        default: "STANDARD",
      },
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

    estimatedDeliveryTime: {
      value: {
        type: Number,
        default: 30,
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
      default: null,
    },

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

deliveryOrderSchema.pre("validate", async function () {
  if (!this.orderNumber) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    this.orderNumber = `DEL-${randomDigits}`;
  }
});

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
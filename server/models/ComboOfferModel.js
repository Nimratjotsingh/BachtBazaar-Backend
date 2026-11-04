import mongoose from "mongoose";

const comboProductItemSchema = new mongoose.Schema(
  {
    // Optional: Link to an existing product from the Master Product Catalog
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
      index: true,
    },
    // Required fields for both linked items and custom ad-hoc combo products
    name: {
      type: String,
      required: [true, "Product name is required for combo item"],
      trim: true,
    },
    image: {
      type: String,
      default: null, // Image URL for custom combo product or override
    },
    original_price: {
      type: Number,
      required: [true, "Original price is required"],
      min: [0, "Original price cannot be negative"],
    },
    combo_price: {
      type: Number,
      required: [true, "Combo price is required"],
      min: [0, "Combo price cannot be negative"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
      default: 1,
    },
    weight_size: {
      type: String, // e.g., "500g", "1L", "Pack of 2"
      trim: true,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: true }
);

const comboOfferSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: [true, "Merchant ID is required"],
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MerchantShop",
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Combo offer name is required"],
      trim: true,
      maxlength: [120, "Combo name cannot exceed 120 characters"],
    },
    description: {
      type: String,
      required: [true, "Combo offer description is required"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    tags: {
      type: [String], // e.g., ["BOGO", "Family Pack", "Lunch Combo"]
      index: true,
      default: [],
    },
    // Array containing the items included in this combo offer
    products: {
      type: [comboProductItemSchema],
      validate: [
        (val) => val.length > 0,
        "A combo offer must include at least one product",
      ],
    },
    start_date: {
      type: Date,
      required: [true, "Start date is required"],
      index: true,
    },
    end_date: {
      type: Date,
      required: [true, "End date is required"],
      index: true,
    },
    // Offer quantity management
    offer_quantity: {
      type: Number,
      default: null, // null represents "unlimited" stock allocation
      min: [0, "Offer quantity cannot be negative"],
    },
    sold_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    terms_and_conditions: {
      type: String,
      required: [true, "Terms and conditions are required"],
      trim: true,
    },

    // --- MODERATION & APPROVAL AUDIT TRAIL ---
    approval_status: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "approved",
      index: true,
    },
    rejection_reason: {
      type: String,
      default: null,
    },
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      refPath: "approved_by_model", // Dynamically links to SuperAdmin, Admin, or Staff
    },
    approved_by_model: {
      type: String,
      enum: ["SuperAdmin", "Admin", "Staff"],
      default: null,
    },
    approval_date: {
      type: Date,
      default: null,
    },

    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// --- Indexes for Fast Queries ---
comboOfferSchema.index({ merchantId: 1, is_active: 1, is_deleted: 1 });
comboOfferSchema.index({ start_date: 1, end_date: 1 });
comboOfferSchema.index({ tags: 1 });

const ComboOffer =
  mongoose.models.ComboOffer || mongoose.model("ComboOffer", comboOfferSchema);

export default ComboOffer;
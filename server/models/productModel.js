import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    merchant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: [true, "Product must belong to a merchant"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
    },
    category_id: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Category",
        },
      ],
      validate: [(val) => val.length > 0, "At least one category is required"],
      index: true,
    },
    subcategory_id: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SubCategory",
        },
      ],
      validate: [(val) => val.length > 0, "At least one subcategory is required"],
      index: true,
    },
    service_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
    },
    price: {
      type: Number,
      required: [true, "Base price is required"],
      min: [0, "Price cannot be negative"],
    },
    discounted_price: {
      type: Number,
      default: null,
    },
    stock: {
      type: Number,
      required: [true, "Stock quantity is required"],
      default: 0,
      min: 0,
    },
    sku: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
      required: [true, "SKU is required for inventory tracking"],
    },
    images: {
      type: [String],
      validate: [
        (val) => val.length <= 10,
        "Maximum 10 images allowed per product",
      ],
    },
    thumbnail: {
      type: String,
      required: [true, "A main thumbnail image is required"],
    },
    tags: {
      type: [String],
      index: true,
    },

    // --- Optional Quantity & Physical Measurement Specs ---
    unit_size: {
      // Unified display string (e.g. "500 g", "1.5 L", "12 pcs", "100 ml")
      type: String,
      trim: true,
      default: null,
    },
    weight: {
      value: {
        type: Number,
        min: 0,
        default: null,
      },
      unit: {
        type: String,
        enum: ["mg", "g", "kg", "oz", "lb"],
        default: null,
      },
    },
    volume: {
      value: {
        type: Number,
        min: 0,
        default: null,
      },
      unit: {
        type: String,
        enum: ["ml", "l", "fl_oz"],
        default: null,
      },
    },

    // --- Optional Shelf-life / Dates ---
    manufacturing_date: {
      type: Date,
      default: null,
    },
    expiry_date: {
      type: Date,
      default: null,
      index: true,
    },

    // --- Admin Approval Fields ---
    approval_status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    approval_date: {
      type: Date,
      default: null,
    },
    rejection_reason: {
      type: String,
      default: "",
    },

    is_active: {
      type: Boolean,
      default: true,
    },
    is_featured: {
      type: Boolean,
      default: false,
    },
    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    ratings: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// --- Indexing for Performance ---
productSchema.index({ is_deleted: 1, is_active: 1, approval_status: 1 });

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

export default Product;
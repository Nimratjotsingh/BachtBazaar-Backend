import mongoose from "mongoose";

const specificationSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, "Specification title/key is required"],
      trim: true,
    },
    value: {
      type: String,
      required: [true, "Specification value is required"],
      trim: true,
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    merchant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: [true, "Product must belong to a merchant"],
      index: true,
    },
    suggestion_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductSuggestion",
      default: null,
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
      index: true,
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

    unit_size: {
      type: String,
      trim: true,
      default: null,
    },

    // --- Dynamic Key-Value Specifications Array ---
    // Example: [{ key: "Weight", value: "500g" }, { key: "Flavour", value: "Chocolate" }]
    specifications: {
      type: [specificationSchema],
      default: [],
    },

    manufacturing_date: {
      type: Date,
      default: null,
    },
    expiry_date: {
      type: Date,
      default: null,
      index: true,
    },

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

productSchema.index({ is_deleted: 1, is_active: 1, approval_status: 1 });
productSchema.index(
  { merchant_id: 1, name: 1 },
  { unique: true, partialFilterExpression: { is_deleted: false } }
);

// Auto-generate SKU fallback hook
productSchema.pre("validate", function () {
  if (!this.sku) {
    const cleanPrefix = (this.name || "PRD")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 3)
      .toUpperCase()
      .padEnd(3, "X");
    const randomHex = Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase();
    const timeSlice = Date.now().toString(36).slice(-4).toUpperCase();
    this.sku = `${cleanPrefix}-${randomHex}-${timeSlice}`;
  }
});

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

export default Product;
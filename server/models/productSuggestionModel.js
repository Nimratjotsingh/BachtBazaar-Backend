import mongoose from "mongoose";

const productSuggestionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product suggestion name is required"],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
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
      required: false
    },
    thumbnail: {
      type: String,
      required: [true, "Thumbnail image is required"],
    },
    images: {
      type: [String],
      default: [],
      validate: [(val) => val.length <= 10, "Maximum 10 images allowed"],
    },
    suggested_price: {
      type: Number,
      default: null,
      min: [0, "Suggested price cannot be negative"],
    },
    tags: {
      type: [String],
      index: true,
    },

    // Measurement & Quantity defaults
    unit_size: {
      type: String,
      trim: true,
      default: null,
    },
    weight: {
      value: { type: Number, min: 0, default: null },
      unit: { type: String, enum: ["mg", "g", "kg", "oz", "lb"], default: null },
    },
    volume: {
      value: { type: Number, min: 0, default: null },
      unit: { type: String, enum: ["ml", "l", "fl_oz"], default: null },
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      default: null,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    usage_count: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

productSuggestionSchema.index({ name: "text", tags: "text" });

const ProductSuggestion =
  mongoose.models.ProductSuggestion ||
  mongoose.model("ProductSuggestion", productSuggestionSchema);

export default ProductSuggestion;
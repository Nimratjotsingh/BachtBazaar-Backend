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
    // Changed to Array of ObjectIds
    category_id: {
      type: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category"
      }],
      validate: [val => val.length > 0, "At least one category is required"],
      index: true,
    },
    // Changed to Array of ObjectIds
    subcategory_id: {
      type: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubCategory"
      }],
      validate: [val => val.length > 0, "At least one subcategory is required"],
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
      validate: {
        validator: function (value) {
          return value === null || value < this.price;
        },
        message: "Discounted price must be lower than the original price",
      },
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
  },
  {
    timestamps: true,
  }
);

// --- Query Middleware: Filter out soft-deleted items by default ---
productSchema.pre(/^find/, function (next) {
  this.find({ is_deleted: { $ne: true } });
  next();
});

const Product = mongoose.model("Product", productSchema);

export default Product;
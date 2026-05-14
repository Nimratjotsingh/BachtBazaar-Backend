import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    merchant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: [true, "Service must belong to a merchant"],
      index: true,
    },
    type: {
      type: String,
      default: "service",
      immutable: true, // Ensures this model always identifies as a service
    },
    name: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Service description is required"],
    },
    // Supporting multiple categories
    category_id: {
      type: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category"
      }],
      validate: [val => val.length > 0, "At least one category is required"],
      index: true,
    },
    subcategory_id: {
      type: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubCategory"
      }],
      index: true,
    },
    service_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceReference", // Optional reference to a master service list
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
        message: "Discounted price must be lower than the base price",
      },
    },
    pricing_type: {
      type: String,
      enum: ["fixed", "starting_from", "hourly", "per_visit", "package", "custom"],
      required: [true, "Pricing type is required for services"],
      default: "fixed",
    },
    images: {
      type: [String],
      validate: [val => val.length <= 10, "Maximum 10 images allowed"],
    },
    thumbnail: {
      type: String,
      required: [true, "Service thumbnail is required"],
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



const Service = mongoose.model("Service", serviceSchema);

export default Service;
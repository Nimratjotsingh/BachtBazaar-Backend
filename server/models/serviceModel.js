import mongoose from "mongoose";

// Embedded Schema for Service Provider Details
const serviceProviderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Service provider name is required"],
      trim: true,
    },
    profile_image: {
      type: String,
      default: null,
      trim: true,
    },
    experience: {
      type: Number, // Number of years (or specify as String if formatted, e.g., '5 years')
      min: [0, "Experience cannot be negative"],
      default: 0,
    },
    designation: {
      type: String,
      trim: true,
      default: null, // e.g., "Senior Stylist", "Master Technician", "Consultant"
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
      default: "prefer_not_to_say",
    },
    specialisation: {
      type: [String], // Array of skills/specialisations or a String
      default: [],
    },
  },
  { _id: false } // Prevents automatic generation of a separate _id for the embedded provider
);

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
      index: true,
    },
    service_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceReference", // Optional reference to a master service list
    },
    // --- Added Service Provider Details ---
    service_provider: {
      type: serviceProviderSchema,
      default: null,
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
      validate: [(val) => val.length <= 10, "Maximum 10 images allowed"],
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
    // Add these fields inside your existing serviceSchema in models/serviceModel.js:

service_id: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "ServiceReference",
  default: null,
  index: true,
},
approval_status: {
  type: String,
  enum: ["pending", "approved", "rejected"],
  default: "pending",
  index: true,
},
rejection_reason: {
  type: String,
  default: null,
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

const Service = mongoose.model("Service", serviceSchema);

export default Service;
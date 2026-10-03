import mongoose from "mongoose";

const serviceReferenceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Service reference name is required"],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Service reference description is required"],
      trim: true,
    },
    image: {
      type: String,
      default: null, // Global default thumbnail/illustration
    },
    category_id: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Category",
        },
      ],
      required: true,
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
    suggested_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      default: null, // Null if created directly by Admin
    },
    status: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "approved",
      index: true,
    },
    rejection_reason: {
      type: String,
      default: null,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Search index for auto-complete suggestions
serviceReferenceSchema.index({ name: "text", description: "text" });

const ServiceReference = mongoose.model("ServiceReference", serviceReferenceSchema);

export default ServiceReference;
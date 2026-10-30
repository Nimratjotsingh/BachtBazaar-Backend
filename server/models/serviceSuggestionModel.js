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
    
    // --- Creator Attribution (Merchant, Admin, or Staff) ---
    suggested_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      default: null, // Null if created directly by Admin/Staff
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      refPath: "created_by_model",
    },
    created_by_model: {
      type: String,
      enum: ["SuperAdmin", "Admin", "Staff", "Merchant"],
      default: null,
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

    // --- Approval / Verification Audit Trail ---
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      refPath: "approved_by_model",
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
  },
  { timestamps: true }
);

// Search index for auto-complete suggestions
serviceReferenceSchema.index({ name: "text", description: "text" });

const ServiceReference = mongoose.models.ServiceReference || mongoose.model("ServiceReference", serviceReferenceSchema);

export default ServiceReference;
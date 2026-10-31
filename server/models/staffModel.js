import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Staff name is required."],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Staff email is required."],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: [true, "Staff phone number is required."],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required."],
    },
    role: {
      type: String,
      enum: ["admin_manager", "support", "operations", "moderator"],
      default: "support",
    },
    // --- Granular Permissions Mapping ---
    permissions: {
      type: [String],
      enum: [
        "view_dashboard",
        "manage_products",
        "manage_product_suggestions",
        "manage_services",
        "manage_service_suggestions",
        "manage_offers"
      ],
      default: [
        "view_dashboard",
        "manage_products",
        "manage_product_suggestions",
        "manage_services",
        "manage_service_suggestions",
        "manage_offers"
      ],
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Staff || mongoose.model("Staff", staffSchema);
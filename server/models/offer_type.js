import mongoose from "mongoose";

const offerTypeSchema = new mongoose.Schema(
  {
    value: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
    },
    label: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    // Modified/Added: Stores server file relative storage path strings for category icons
    icon: {
      type: String,
      default: "",
    },
    // Track if an Admin or a Merchant created this
    created_by_type: {
      type: String,
      enum: ["admin", "merchant"],
      required: true,
    },
    // Dynamically references either the Admin model or Merchant model
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "created_by_type", 
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Optimize filtering for combined merchant/admin views
offerTypeSchema.index({ created_by_type: 1, owner_id: 1 });

const OfferType = mongoose.model("OfferType", offerTypeSchema);
export default OfferType;
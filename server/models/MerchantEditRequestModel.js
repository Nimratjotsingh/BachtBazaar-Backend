import mongoose from "mongoose";

const merchantEditRequestSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      index: true,
    },
    // Specifies what entity is being edited (e.g., "Merchant", "MerchantShop", "MerchantBusinessDoc")
    targetModel: {
      type: String,
      enum: ["Merchant", "MerchantShop", "MerchantBusinessDoc"],
      default: "Merchant",
    },
    // Optional: ID of the specific shop or document if editing a sub-resource
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    // Stores the JSON object containing the fields and values the merchant wants to update
    proposedChanges: {
      type: mongoose.Schema.Types.Mixed,
      
    },
    // Request lifecycle status
    status: {
      type: String,
      enum: ["pending", "allowed", "rejected", "consumed"],
      default: "pending",
      index: true,
    },
    adminNotes: {
      type: String,
      trim: true,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin", // or SuperAdmin model reference depending on your setup
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// High-performance index for querying active requests per merchant
merchantEditRequestSchema.index({ merchantId: 1, status: 1 });

const MerchantEditRequest = 
  mongoose.models.MerchantEditRequest || 
  mongoose.model("MerchantEditRequest", merchantEditRequestSchema);

export default MerchantEditRequest;
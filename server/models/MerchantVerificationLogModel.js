import mongoose from "mongoose";

const merchantVerificationLogSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      index: true,
    },
    requestId: {
      type: String,
      required: true,
      index: true,
    },
    taskId: {
      type: String,
      index: true,
    },
    groupId: {
      type: String,
    },
    type: {
      type: String, // e.g., "ind_pan", "ind_aadhaar", "ind_gst_certificate", "ind_driving_license"
      required: true,
      index: true,
    },
    status: {
      type: String, // e.g., "completed", "in_progress", "failed"
      required: true,
    },
    action: {
      type: String,
      default: "verify_with_source",
    },
    isValid: {
      type: Boolean,
      default: false,
    },
    // --- Dedicated fields for quick admin inspection & filtering ---
    name: {
      type: String,
      default: null,
      trim: true,
    },
    documentNumber: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    dob: {
      type: String, // Stored as a string (e.g., "YYYY-MM-DD" or formatted date)
      default: null,
    },
    resultOutput: {
      type: mongoose.Schema.Types.Mixed, // Stores the full source_output / result payload
      default: {},
    },
    rawApiResponse: {
      type: mongoose.Schema.Types.Mixed, // Stores the complete raw JSON response from IDfy
      default: {},
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound indexes for fast admin lookup and filtering
merchantVerificationLogSchema.index({ merchantId: 1, createdAt: -1 });
merchantVerificationLogSchema.index({ documentNumber: 1 });

const MerchantVerificationLog =
  mongoose.models.MerchantVerificationLog ||
  mongoose.model("MerchantVerificationLog", merchantVerificationLogSchema);

export default MerchantVerificationLog;
import mongoose from "mongoose";

const merchantBusinessDocSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      unique: true,
      index: true,
    },
    // Document Identifiers
    gstNumber: { type: String, trim: true, uppercase: true },
    tradeLicenseNumber: { type: String, trim: true },
    shopRegistrationNumber: { type: String, trim: true },
    fssaiNumber: { type: String, trim: true },
    panNumber: { type: String, trim: true, uppercase: true },
    aadhaarNumber: { type: String, trim: true },

    // Document Image URLs (stored paths or cloud links)
    gstImage: { type: String, default: null },
    tradeLicenseImage: { type: String, default: null },
    shopRegistrationImage: { type: String, default: null },
    fssaiImage: { type: String, default: null },
    panImage: { type: String, default: null },
    aadhaarFrontImage: { type: String, default: null },
    aadhaarBackImage: { type: String, default: null },

    // Verification ledger
    verificationResults: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

export default mongoose.models.MerchantBusinessDoc ||
  mongoose.model("MerchantBusinessDoc", merchantBusinessDocSchema);
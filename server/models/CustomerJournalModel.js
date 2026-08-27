import mongoose from "mongoose";

const customerJournalSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MerchantShop",
      default: null,
      index: true,
    },
    // If the customer is already registered on BachatBazarr, optionally link their userId
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    // Plain string for service / product description
    service: {
      type: String,
      required: true,
      trim: true,
    },
    amountCharged: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["PAID", "DUE", "UPI", "CASH"],
      default: "PAID",
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    visitDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // Media Assets
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    voiceNote: {
      type: String,
      trim: true,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexing for fast merchant queries, search by phone, and date sorting
customerJournalSchema.index({ merchantId: 1, isDeleted: 1, visitDate: -1 });
customerJournalSchema.index({ merchantId: 1, phoneNumber: 1, isDeleted: 1 });

const CustomerJournal =
  mongoose.models.CustomerJournal ||
  mongoose.model("CustomerJournal", customerJournalSchema);

export default CustomerJournal;
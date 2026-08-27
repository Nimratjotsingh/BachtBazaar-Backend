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
    // Unified Product / Service Item Line
    items: [
      {
        itemType: {
          type: String,
          enum: ["PRODUCT", "SERVICE", "CUSTOM"],
          default: "CUSTOM",
        },
        // Mapped reference if selecting from merchant's existing catalog
        referenceId: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: "items.itemModel",
          default: null,
        },
        itemModel: {
          type: String,
          enum: ["Product", "Service"],
          default: null,
        },
        // Custom or catalog item name
        title: {
          type: String,
          required: true,
          trim: true,
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
        unitPrice: {
          type: Number,
          default: 0,
          min: 0,
        },
        totalPrice: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    ],
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
      type: String, // Cloudinary/S3/local audio URL (mp3/m4a/wav)
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
import mongoose from "mongoose";
import { ROLES } from "../constants/roles.js";

const imageSchema = new mongoose.Schema(
  {
    data: Buffer,
    contentType: String,
  },
  { _id: false }
);

const merchantSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: [ROLES.MERCHANT, ROLES.SUPER_ADMIN],
      default: ROLES.MERCHANT,
    },
    isDeliveryEnabled: {
      type: Boolean,
      default: false,
    },

    // --- DYNAMIC MERCHANT DELIVERY PRICING CONFIGURATION ---
    deliveryPricing: {
      baseFee: {
        type: Number,
        default: 20, // Baseline fixed startup fee (e.g., first 1-2 km)
        min: 0,
      },
      ratePerKm: {
        type: Number,
        default: 10, // Standard 1 KM = X INR rate
        min: 0,
      },
      minimumDeliveryFee: {
        type: Number,
        default: 20,
        min: 0,
      },

      // Night Surcharge Configuration
      nightConfig: {
        isEnabled: { type: Boolean, default: false },
        ratePerKm: { type: Number, default: 15, min: 0 }, // Specific rate per km during night
        flatSurcharge: { type: Number, default: 0, min: 0 }, // Optional extra flat fee
        startTime: { type: String, default: "22:00" }, // 10:00 PM (HH:mm 24-hr)
        endTime: { type: String, default: "06:00" }, // 06:00 AM (HH:mm 24-hr)
      },

      // Peak Hours Surcharge Configuration (e.g. Lunch/Dinner rushes)
      peakConfig: {
        isEnabled: { type: Boolean, default: false },
        ratePerKm: { type: Number, default: 14, min: 0 }, // Specific rate per km during rush
        flatSurcharge: { type: Number, default: 0, min: 0 }, // Optional extra flat fee
        startTime: { type: String, default: "19:00" }, // 7:00 PM
        endTime: { type: String, default: "21:30" }, // 9:30 PM
      },
    },

    name: String,
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    city: String,
    profileImage: {
      type: imageSchema,
      default: {},
    },

    fcmToken: {
      type: String,
      default: null,
      index: true,
    },
    fcmTokens: [
      {
        token: { type: String, required: true },
        deviceType: {
          type: String,
          enum: ["android", "ios", "web"],
          default: "android",
        },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    isNotificationEnabled: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["verified", "unverified", "rejected"],
      default: "unverified",
    },
    rejectedReason: {
      type: String,
      default: null,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

merchantSchema.index({ fcmToken: 1 });

export default mongoose.models.Merchant || mongoose.model("Merchant", merchantSchema);
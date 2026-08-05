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

    // --- MOBILE PUSH NOTIFICATIONS ---
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
    // Added field to log administrative rejection reasons
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
  },
  { timestamps: true }
);

// --- INDEX CONFIGURATION ---
merchantSchema.index({ fcmToken: 1 });

export default mongoose.models.Merchant || mongoose.model("Merchant", merchantSchema);
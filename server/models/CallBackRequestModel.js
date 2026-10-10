import mongoose from "mongoose";

const callbackRequestSchema = new mongoose.Schema(
  {
    requesterType: {
      type: String,
      required: true,
      enum: ["USER", "MERCHANT"],
      index: true,
    },
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "requesterModel",
      index: true,
    },
    requesterModel: {
      type: String,
      required: true,
      enum: ["User", "Merchant"],
    },
    contactName: {
      type: String,
      required: true,
      trim: true,
    },
    contactPhone: {
      type: String,
      required: true,
      trim: true,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    // Free-text string topic as requested (no enum)
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      trim: true,
      default: "",
    },
    preferredCallTime: {
      type: String, // e.g., "10:00 AM - 12:00 PM" or ISO Date string
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "resolved"],
      default: "pending",
      index: true,
    },
    adminNotes: {
      type: String,
      trim: true,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Assuming Super Admins are in User collection
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

callbackRequestSchema.index({ createdAt: -1 });

export default mongoose.models.CallbackRequest ||
  mongoose.model("CallbackRequest", callbackRequestSchema);2
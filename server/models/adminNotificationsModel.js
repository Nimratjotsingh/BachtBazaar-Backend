import mongoose from "mongoose";

const adminNotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        "merchant_verification", 
        "user_verification", 
        "offer_review", 
        "product_review", 
        "service_review"
      ],
      required: true,
      index: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null, // Links directly to the Merchant, User, or Review ID for quick auditing
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// High-performance index for fetching unread notifications
adminNotificationSchema.index({ isRead: 1, createdAt: -1 });

export default mongoose.models.AdminNotification || 
  mongoose.model("AdminNotification", adminNotificationSchema);
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    
    recipientType: {
      type: String,
      enum: ["User", "Merchant"],
      required: true,
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "recipientType",
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        "CIRCLE_INVITATION",
        "CIRCLE_SHARED_OFFER",
        "BEST_PRICE_REQUEST",
        "BEST_PRICE_NEW_BID",
        "PRICE_DROP",
        "BIRTHDAY_WISH",
        "COIN_EXPIRY",
        "GENERAL",
      ],
      default: "GENERAL",
      index: true,
    },
    // Optional navigation & contextual payload data
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying user/merchant notification feeds
notificationSchema.index({ recipientId: 1, recipientType: 1, createdAt: -1 });

const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);

export default Notification;
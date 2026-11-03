import mongoose from "mongoose";

const userOfferReviewSchema = new mongoose.Schema(
  {
    // --- Core Relationships ---
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: [true, "Merchant ID is required"],
      index: true,
    },
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
      required: [true, "Offer ID is required"],
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MerchantShop",
      required: [true, "Merchant shop location is required"],
      index: true,
    },
    redemptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OfferRedemption",
      default: null,
      index: true,
      // Optional: Links the review directly to a verified purchase/redemption instance
    },

    // --- Review Content ---
    rating: {
      type: Number,
      required: [true, "Star rating is required"],
      min: [1, "Rating must be at least 1 star"],
      max: [5, "Rating cannot exceed 5 stars"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Review title is required"],
      trim: true,
      maxlength: [100, "Review title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Review description is required"],
      trim: true,
      maxlength: [1000, "Review description cannot exceed 1000 characters"],
    },
    
    // --- Media Attachments ---
    images: {
      type: [String], // Array of image URLs/paths uploaded by the user (e.g. food, bill, store ambiance)
      default: [],
      validate: [(val) => val.length <= 5, "Maximum 5 review images allowed"],
    },

    // --- Granular Experience Tags (Optional, great for merchant insights) ---
    tags: {
      type: [String], // e.g. ["Great Service", "Fresh Quality", "Easy Redemption", "Value for Money"]
      index: true,
      default: [],
    },

    // --- Verification & Moderation ---
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
      index: true,
      // True if the system verified the user actually claimed or redeemed the offer
    },
    approvalStatus: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "approved", // Set to "pending" if you want automated content moderation queues
      index: true,
    },
    rejectionReason: {
      type: String,
      default: null,
    },

    // --- Engagement / Social Proof Metrics ---
    helpfulVotesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    merchantResponse: {
      replyText: { type: String, trim: true, default: null },
      repliedAt: { type: Date, default: null },
    },

    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// --- Indexes for High-Performance Queries ---
// Ensure a user can only review the same offer/redemption once
userOfferReviewSchema.index({ userId: 1, offerId: 1 }, { unique: true, sparse: true });

// Optimize lookups when fetching reviews per merchant, shop, or offer
userOfferReviewSchema.index({ merchantId: 1, approvalStatus: 1, createdAt: -1 });
userOfferReviewSchema.index({ shopId: 1, rating: 1 });
userOfferReviewSchema.index({ offerId: 1, approvalStatus: 1 });

const UserOfferReview =
  mongoose.models.UserOfferReview ||
  mongoose.model("UserOfferReview", userOfferReviewSchema);

export default UserOfferReview;
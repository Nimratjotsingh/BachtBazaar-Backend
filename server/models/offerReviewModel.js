import mongoose from "mongoose";

const offerReviewSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: [true, "Merchant ID is required."],
      index: true,
    },
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
      required: [true, "Associated Offer ID is required."],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required."],
      min: [1, "Rating must be at least 1."],
      max: [5, "Rating cannot exceed 5."],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters."],
      required: [true, "Review description is required."],
    },
    images: {
      type: [String],
      default: [],
      validate: [
        (val) => val.length <= 5,
        "Maximum 5 images allowed per feedback.",
      ],
    },
    // Administrative moderation / visibility flags
    status: {
      type: String,
      enum: ["unread", "reviewed", "archived"],
      default: "unread",
      index: true,
    },
    adminNotes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate review submissions for the same offer by the same merchant
offerReviewSchema.index({ merchantId: 1, offerId: 1 }, { unique: true });

const OfferReview =
  mongoose.models.OfferReview ||
  mongoose.model("OfferReview", offerReviewSchema);

export default OfferReview;
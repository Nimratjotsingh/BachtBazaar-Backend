import mongoose from "mongoose";

const offerClickSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      index: true,
    },
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    totalClicks: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Array to store unique users who clicked the offer today to prevent duplicate counting
    clickedUsers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        clickedAt: {
          type: Date,
          default: Date.now,
        },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

// Compound unique index ensuring one record per merchant, offer, and calendar day
offerClickSchema.index({ merchantId: 1, offerId: 1, date: 1 }, { unique: true });

const OfferClick = mongoose.models.OfferClick || mongoose.model("OfferClick", offerClickSchema);

export default OfferClick;
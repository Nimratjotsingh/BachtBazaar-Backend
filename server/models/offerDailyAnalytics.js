import mongoose from "mongoose";

const offerAnalyticsSchema = new mongoose.Schema(
  {
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
      required: true,
      unique: true,
      index: true,
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      index: true,
    },

    // --- COUNTERS ---
    clicks: {
      type: Number,
      default: 0,
    },
    redeems: {
      type: Number,
      default: 0,
    },
    claims: {
      type: Number,
      default: 0,
    },
    footfall: {
      type: Number,
      default: 0,
    },
    claimedUsers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        redemptionCode: {
          type: String,
          default: "",
        },
        claimedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

const OfferAnalytics =
  mongoose.models.OfferAnalytics ||
  mongoose.model("OfferAnalytics", offerAnalyticsSchema);

export default OfferAnalytics;
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

    // --- USER LISTS FOR EACH METRIC ---

    // 1. Users who clicked/viewed this offer
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
      },
    ],

    // 2. Users who digitally redeemed/reserved this offer in the app
    redeemedUsers: [
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
        redeemedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // 3. Users who successfully claimed the offer
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

    // 4. Users who visited in-store (Footfall claims)
    footfallUsers: [
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
        visitedAt: {
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
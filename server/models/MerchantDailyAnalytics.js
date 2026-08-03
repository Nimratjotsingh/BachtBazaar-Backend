import mongoose from "mongoose";

const merchantDailyAnalyticsSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MerchantShop",
      default: null,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },

    // --- DAILY COUNTERS ---
    totalViewers: { type: Number, default: 0 },
    offerClicks: { type: Number, default: 0 },
    redeems: { type: Number, default: 0 },
    footfall: { type: Number, default: 0 },

    // --- DAILY USER LOGS ---
    viewerUsers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    clickedUsers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        offerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Offer",
        },
        clickedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    redeemedUsers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        offerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Offer",
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
    footfallUsers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        offerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Offer",
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

// Unified compound unique index covering both shop-level and merchant-level daily entries safely
merchantDailyAnalyticsSchema.index(
  { merchantId: 1, shopId: 1, date: 1 },
  { unique: true }
);

const MerchantDailyAnalytics =
  mongoose.models.MerchantDailyAnalytics ||
  mongoose.model("MerchantDailyAnalytics", merchantDailyAnalyticsSchema);

export default MerchantDailyAnalytics;
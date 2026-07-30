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
    totalViewers: { type: Number, default: 0 },
    offerClicks: { type: Number, default: 0 },
    redeems: { type: Number, default: 0 },
    footfall: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Unified compound unique index covering both cases safely
merchantDailyAnalyticsSchema.index({ merchantId: 1, shopId: 1, date: 1 }, { unique: true });

const MerchantDailyAnalytics =
  mongoose.models.MerchantDailyAnalytics ||
  mongoose.model("MerchantDailyAnalytics", merchantDailyAnalyticsSchema);

export default MerchantDailyAnalytics;
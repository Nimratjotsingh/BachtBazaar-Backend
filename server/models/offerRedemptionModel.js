import mongoose from "mongoose";

const offerRedemptionSchema = new mongoose.Schema(
  {
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MerchantShop",
      required: true,
      index: true,
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      index: true,
    },
    // Unique alphanumeric token or QR payload string
    redemptionCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["redeemed", "claimed", "expired", "cancelled"],
      default: "redeemed",
      index: true,
    },
    redeemedAt: {
      type: Date,
      default: Date.now,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent user from double-redeeming the same active offer if per-user limit is 1
offerRedemptionSchema.index({ offerId: 1, userId: 1, status: 1 });

const OfferRedemption =
  mongoose.models.OfferRedemption ||
  mongoose.model("OfferRedemption", offerRedemptionSchema);

export default OfferRedemption;
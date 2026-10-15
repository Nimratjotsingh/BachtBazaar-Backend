import mongoose from "mongoose";

const offerRedeemSchema = new mongoose.Schema(
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
    totalRedeems: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Array to log each successful coupon/offer redemption transaction for the day
    redeemedUsers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        
        redeemedAt: {
          type: Date,
          default: Date.now,
        },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

// Compound unique index ensuring one daily analytical document per offer and merchant
offerRedeemSchema.index({ merchantId: 1, offerId: 1, date: 1 }, { unique: true });

const OfferRedeem = mongoose.models.OfferRedeem || mongoose.model("OfferRedeem", offerRedeemSchema);

export default OfferRedeem;
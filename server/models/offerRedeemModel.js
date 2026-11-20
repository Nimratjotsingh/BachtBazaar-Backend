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
      required: true,
      refPath: "offerModel", // Dynamically references either "Offer" or "ComboOffer"
      index: true,
    },
    offerModel: {
      type: String,
      required: true,
      enum: ["Offer", "ComboOffer"],
      default: "Offer",
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
    // Array to log each successful coupon/offer/combo redemption transaction for the day
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

// Compound unique index ensuring one daily analytical document per merchant, campaign (offer or combo), and calendar day
offerRedeemSchema.index(
  { merchantId: 1, offerId: 1, offerModel: 1, date: 1 },
  { unique: true }
);

const OfferRedeem =
  mongoose.models.OfferRedeem || mongoose.model("OfferRedeem", offerRedeemSchema);

export default OfferRedeem;
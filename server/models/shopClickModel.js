import mongoose from "mongoose";

const shopClickSchema = new mongoose.Schema(
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
    // Array to store unique users who clicked today to prevent duplicate counting
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

// Compound unique index ensuring one record per merchant, shop, and calendar day
shopClickSchema.index({ merchantId: 1, shopId: 1, date: 1 }, { unique: true });

const ShopClick = mongoose.models.ShopClick || mongoose.model("ShopClick", shopClickSchema);

export default ShopClick;
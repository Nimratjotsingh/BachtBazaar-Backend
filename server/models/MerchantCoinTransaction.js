import mongoose from "mongoose";

const MerchantCoinTransactionSchema = new mongoose.Schema(
  {
    wallet: { type: mongoose.Schema.Types.ObjectId, ref: "MerchantWallet", required: true },
    merchant: { type: mongoose.Schema.Types.ObjectId, ref: "Merchant", required: true },
    amount: { type: Number, required: true },
    type: {
      type: String,
      enum: ["EARNED", "SPENT", "EXPIRED", "ADMIN_ADJUSTMENT"],
      required: true,
    },
    source: {
      type: String,
      enum: [
        "MERCHANT_TASK",
        "MERCHANT_LEAGUE_REWARD",
        "PROMOTIONAL_BONUS", // <--- ADD THIS ENUM VALUE
        "MERCHANT_QUEST",     // <--- OPTIONAL: ADD FOR QUEST-SPECIFIC LOGGING
        "PLATFORM_FEE_DISCOUNT",
        "SPONSORED_ADS",
        "EXPIRATION",
        "ADMIN",
      ],
      required: true,
    },
    description: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.MerchantCoinTransaction ||
  mongoose.model("MerchantCoinTransaction", MerchantCoinTransactionSchema);
import mongoose from "mongoose";

const MerchantCoinBatchSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  remainingAmount: { type: Number, required: true },
  source: {
    type: String,
    enum: ["MERCHANT_TASK", "MERCHANT_LEAGUE_REWARD", "PROMOTIONAL_BONUS", "ADMIN_CREDIT"],
    required: true,
  },
  sourceId: { type: mongoose.Schema.Types.ObjectId }, // Strictly ObjectIds
  batchTag: { type: String, default: null },           // Stores custom tags like "questId_timestamp"
  expiresAt: { type: Date, required: true },
  isExpired: { type: Boolean, default: false },
});

const MerchantWalletSchema = new mongoose.Schema(
  {
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      unique: true,
    },
    totalBalance: { type: Number, default: 0 },
    lifetimeEarned: { type: Number, default: 0 },
    lifetimeSpent: { type: Number, default: 0 },
    coinBatches: [MerchantCoinBatchSchema],
  },
  { timestamps: true }
);

export default mongoose.models.MerchantWallet || mongoose.model("MerchantWallet", MerchantWalletSchema);
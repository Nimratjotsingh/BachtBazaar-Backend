import mongoose from "mongoose";

const referralSchema = new mongoose.Schema(
  {
    referrerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referredUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One referral record per referee
      index: true,
    },
    referralCodeUsed: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    rewardCoinsAwarded: {
      type: Number,
      default: 50, // Bachat Coins for successful referral
    },
    status: {
      type: String,
      enum: ["ACTIVE", "COMPLETED", "EXPIRED"],
      default: "ACTIVE",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

referralSchema.index({ referrerId: 1, referredUserId: 1 });

const Referral =
  mongoose.models.Referral || mongoose.model("Referral", referralSchema);

export default Referral;
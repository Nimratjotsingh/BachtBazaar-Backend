import mongoose from "mongoose";

const userMilestoneGoalSchema = new mongoose.Schema(
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
      
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Goal title is required"],
      trim: true,
      maxlength: 100, // e.g. "Frequent Diner Club"
    },
    actionType: {
      type: String,
      enum: ["REDEEM", "CLAIM", "OFFER_CLICK", "FOOTFALL_VISIT"],
      required: true,
      index: true,
    },
    targetCount: {
      type: Number,
      required: true,
      min: [1, "Target count must be at least 1"],
    },
    currentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    rewardDescription: {
      type: String,
      required: [true, "Reward description is required"],
      trim: true, // e.g. "Get 1 Free Butter Chicken on your 10th redemption!"
    },
    rewardClaimCode: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["IN_PROGRESS", "COMPLETED", "CLAIMED", "EXPIRED", "CANCELLED"],
      default: "IN_PROGRESS",
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days default
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

userMilestoneGoalSchema.index({ userId: 1, merchantId: 1, status: 1 });

const UserMilestoneGoal =
  mongoose.models.UserMilestoneGoal ||
  mongoose.model("UserMilestoneGoal", userMilestoneGoalSchema);

export default UserMilestoneGoal;
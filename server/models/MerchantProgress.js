import mongoose from "mongoose";

const taskProgressSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    currentCount: {
      type: Number,
      default: 0,
    },
    targetValue: {
      type: Number,
      required: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    pointsEarned: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const merchantProgressSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      unique: true,
      index: true,
    },
    currentLeagueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "League",
      required: true,
      index: true,
    },
    totalPoints: {
      type: Number,
      default: 0,
      index: true,
    },
    taskProgress: [taskProgressSchema],
    lastPromotedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

merchantProgressSchema.index({ totalPoints: -1 });

const MerchantProgress =
  mongoose.models.MerchantProgress ||
  mongoose.model("MerchantProgress", merchantProgressSchema);

export default MerchantProgress;
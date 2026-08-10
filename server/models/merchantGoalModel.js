import mongoose from "mongoose";

const MerchantGoalSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    metricType: {
      type: String,
      required: true,
      enum: [
        "PRODUCTS_CREATED",
        "SERVICES_CREATED",
        "OFFERS_CREATED",
        "CLAIMS_HANDLED",
        "REDEMPTIONS_COMPLETED",
      ],
    },
    offerTypeConstraint: {
      type: String,
      enum: ["ALL", "BANNER", "CALENDAR"],
      default: "ALL",
    },
    targetValue: {
      type: Number,
      required: true,
      min: 1,
    },
    timeframeType: {
      type: String,
      enum: ["WEEKLY", "MONTHLY", "CUSTOM"],
      default: "MONTHLY",
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.MerchantGoal ||
  mongoose.model("MerchantGoal", MerchantGoalSchema);
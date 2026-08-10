import mongoose from "mongoose";

const MerchantQuestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    metricType: {
      type: String,
      required: true,
      enum: [
        "PRODUCTS_CREATED",
        "SERVICES_CREATED",
        "OFFERS_CREATED",
        "CLAIMS_HANDLED",
        "REDEMPTIONS_COMPLETED",
        "STORE_VIEWS",
        "LOGIN_STREAK",    
        "TOTAL_LOGINS",
        "BANNER_VIEWS",            
        "CUSTOMER_VISITS",         
        "NEW_CUSTOMERS",           
        "REPEAT_CUSTOMERS",
      ],
    },
    offerTypeConstraint: {
      type: String,
      enum: ["ALL", "BANNER", "CALENDAR"],
      default: "ALL",
    },
    targetValue: { type: Number, required: true, min: 1 },
    rewardCoins: { type: Number, required: true, min: 1 },
    validityDaysOverride: { type: Number, default: null }, // Null uses global admin default
    timeframeType: {
      type: String,
      enum: ["DAILY", "WEEKLY", "MONTHLY", "CUSTOM"],
      default: "DAILY",
    },
    startDate: { type: Date, default: null }, // Used when timeframeType === 'CUSTOM'
    endDate: { type: Date, default: null },   // Used when timeframeType === 'CUSTOM'
    is_active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

export default mongoose.models.MerchantQuest || mongoose.model("MerchantQuest", MerchantQuestSchema);
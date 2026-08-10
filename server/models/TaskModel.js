import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required."],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    leagueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "League",
      required: true,
      index: true, 
    },
    metricType: {
      type: String,
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
      required: true,
      index: true,
    },
    // Add this field to both TaskSchema and MerchantQuestSchema
      offerTypeConstraint: {
        type: String,
        enum: ["ALL", "BANNER", "CALENDAR"],
        default: "ALL",
      },
    targetValue: {
      type: Number,
      required: [true, "Target value milestone is required."],
      min: [1, "Target value must be at least 1."],
    },
    pointsReward: {
      type: Number,
      required: [true, "Points reward is required."],
      min: [1, "Points reward must be at least 1."],
    },
    // Timeframe during which this task can be completed
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    rewardCoins: { type: Number, required: true },
  validityDaysOverride: { type: Number, default: null }
  },
  { timestamps: true }
);

taskSchema.index({ leagueId: 1, metricType: 1, is_active: 1 });

const Task = mongoose.models.Task || mongoose.model("Task", taskSchema);

export default Task;
import mongoose from "mongoose";

const leagueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "League name is required."],
      trim: true,
      unique: true, // e.g. "Silver", "Gold", "Platinum", "Diamond"
    },
    tierRank: {
      type: Number,
      required: true,
      unique: true, // Order hierarchy: 1 = Silver, 2 = Gold, 3 = Platinum, etc.
    },
    minPointsRequired: {
      type: Number,
      required: true,
      default: 0, // Points required to enter/unlock this league
    },
    badgeIcon: {
      type: String,
      default: "", // Icon/image path for the league badge
    },
    themeColor: {
      type: String,
      default: "#3B82F6", // Hex code for UI rendering
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    cycleType: {
      type: String,
      enum: ["monthly", "quarterly", "yearly", "all_time", "custom"],
      default: "monthly",
    },
    // Optional custom timeframe window managed by Admin
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    perks: [
      {
        type: String,
        trim: true, // e.g. "Featured store placement", "Reduced commission rate"
      },
    ],
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    rewardCoins: { type: Number, required: true },
  validityDaysOverride: { type: Number, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true }
);

leagueSchema.index({ tierRank: 1, minPointsRequired: 1 });

const League = mongoose.models.League || mongoose.model("League", leagueSchema);

export default League;
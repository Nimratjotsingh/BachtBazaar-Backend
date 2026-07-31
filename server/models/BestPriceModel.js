import mongoose from "mongoose";

const bestPriceRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Request title/item specification is required."],
      trim: true,
      maxLength: [100, "Title description cannot exceed 100 characters."]
    },
    description: {
      type: String,
      trim: true,
      maxLength: [500, "Detailed description cannot exceed 500 characters."]
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Target category is required."],
      index: true,
    },
    budget: {
      type: Number,
      required: [true, "Target budget allocation value is required."],
      min: [1, "Budget threshold must be at least 1."],
    },
    // Urgency metrics tracking when the item is needed
    timeframe: {
      type: String,
      enum: ["today", "within 2 days", "flexible"],
      required: [true, "Delivery/Fulfilment timeframe urgency is required."]
    },
    
    // Geographic Position Data Elements matching your app architectures
    latitude: {
      type: Number,
      required: [true, "Latitude positional mapping value is required."]
    },
    longitude: {
      type: Number,
      required: [true, "Longitude positional mapping value is required."]
    },
    formattedAddress: {
      type: String,
      trim: true,
      default: "" // Highly recommended for display on merchant dashboards without computing coordinates every time
    },
    city: {
      type: String,
      trim: true,
      lowercase: true,
      index: true
    },

    // Administrative lifecycle controls
    status: {
      type: String,
      enum: ["pending", "active", "completed", "expired", "cancelled","closed"],
      default: "active",
      index: true
    },
    
    // Tracks the count of competitive bids received from merchants without running heavy database lookups
    bidCount: {
      type: Number,
      default: 0
    },

    // Timestamp when this request automatically stops showing up for merchants
    expiresAt: {
      type: Date,
      required: true,
      index: true
    }
  },
  {
    timestamps: true,
  }
);

// --- HOOKS: Pre-validate execution calculation logic ---
// --- HOOKS: Pre-validate execution calculation logic ---
bestPriceRequestSchema.pre("validate", function () {
  // Automatically calculate the expiration date based on their timeframe selection
  if (this.isNew && !this.expiresAt) {
    const calculatedExpiry = new Date();
    
    if (this.timeframe === "today") {
      calculatedExpiry.setHours(23, 59, 59, 999); // Active until end of current day
    } else if (this.timeframe === "within 2 days") {
      calculatedExpiry.setDate(calculatedExpiry.getDate() + 2); // Drops off in 48 hours
    } else {
      calculatedExpiry.setDate(calculatedExpiry.getDate() + 15); // 'flexible' bids remain open for 15 days
    }
    
    this.expiresAt = calculatedExpiry;
  }
  // ✓ REMOVED: next(); statement is deleted to avoid callback crashes
});

// --- HIGH PERFORMANCE COMPOSITE INDEXES ---
// Allows fast queries for scanning active requests within bounded local target areas
bestPriceRequestSchema.index({ latitude: 1, longitude: 1, status: 1 });
bestPriceRequestSchema.index({ categoryId: 1, status: 1 });

const BestPriceRequest = mongoose.models.BestPriceRequest || mongoose.model("BestPriceRequest", bestPriceRequestSchema);
export default BestPriceRequest;
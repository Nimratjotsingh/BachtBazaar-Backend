import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    data: Buffer,
    contentType: String,
  },
  { _id: false }
);

const merchantShopSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      unique: true,
    },
    shopName: {
      type: String,
      trim: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    subCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
    },
    address: String,
    address1: String,
    city: String,
    latitude: Number,
    longitude: Number,

    // --- MERCHANT CONFIGURED VISIBILITY RADIUS ---
    visibilityRadiusKm: {
      type: Number,
      default: 15, // Default baseline radius (e.g. 15 km)
      min: [1, "Visibility radius must be at least 1 km"],
      max: [100, "Visibility radius cannot exceed 100 km"],
      index: true,
    },

    logo: imageSchema,
    banner: imageSchema,
    phone: String,
    description: String,
    openingHours: {
      type: Map,
      of: {
        open: String, // e.g., "09:00" (HH:mm)
        close: String, // e.g., "21:00" (HH:mm)
        isClosed: {
          type: Boolean,
          default: false, // full day off (e.g. Sunday)
        },
      },
    },

    // --- MANUAL OVERRIDE (Close early / open emergency) ---
    manualOverride: {
      status: {
        type: String,
        enum: ["AUTO", "FORCE_CLOSED", "FORCE_OPEN"],
        default: "AUTO",
      },
      reason: {
        type: String,
        default: null,
      },
      closedUntil: {
        type: Date,
        default: null,
      },
      updatedAt: {
        type: Date,
        default: null,
      },
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Helper to compute live open/close status
 * Takes manualOverride and openingHours into consideration
 */
merchantShopSchema.methods.calculateIsOpen = function (targetDate = new Date()) {
  const now = targetDate;

  // 1. Check if temporary force-close expired
  if (
    this.manualOverride?.status === "FORCE_CLOSED" &&
    this.manualOverride?.closedUntil &&
    now >= this.manualOverride.closedUntil
  ) {
    this.manualOverride.status = "AUTO";
  }

  // 2. Direct manual override takes highest priority
  if (this.manualOverride?.status === "FORCE_CLOSED") {
    return {
      isOpen: false,
      reason: this.manualOverride.reason || "Temporarily closed by merchant",
      isManualOverride: true,
    };
  }

  if (this.manualOverride?.status === "FORCE_OPEN") {
    return {
      isOpen: true,
      reason: "Open by merchant override",
      isManualOverride: true,
    };
  }

  // 3. Fallback to weekly opening hours schedule (AUTO)
  if (!this.openingHours) {
    return { isOpen: true, isManualOverride: false };
  }

  const daysOfWeek = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const currentDay = daysOfWeek[now.getDay()];
  const todaySchedule =
    this.openingHours instanceof Map
      ? this.openingHours.get(currentDay)
      : this.openingHours[currentDay];

  if (!todaySchedule || todaySchedule.isClosed) {
    return { isOpen: false, reason: "Closed for the day", isManualOverride: false };
  }

  // Parse HH:mm
  const [openHour, openMin] = (todaySchedule.open || "00:00").split(":").map(Number);
  const [closeHour, closeMin] = (todaySchedule.close || "23:59").split(":").map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;

  const isWithinHours = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;

  return {
    isOpen: isWithinHours,
    reason: isWithinHours ? "Open" : "Outside business hours",
    isManualOverride: false,
  };
};

// Attach dynamic virtual boolean property
merchantShopSchema.virtual("isOpen").get(function () {
  return this.calculateIsOpen().isOpen;
});

export default mongoose.models.MerchantShop || mongoose.model("MerchantShop", merchantShopSchema);
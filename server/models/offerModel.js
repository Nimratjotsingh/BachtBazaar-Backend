import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    merchant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      index: true,
    },
    display_type: {
      type: String,
      enum: ["banner", "calendar", "all"],
      default: "all",
      index: true,
    },
    offer_type_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OfferType",
      index: true,
    },
    sub_offer_type_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubOfferType",
      index: true,
    },
    banner_type_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BannerType",
      index: true,
      default: null,
    },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      index: true,
    },
    product_id: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Product",
      index: true,
      default: [],
    },
    title: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
    },
    thumbnail: {
      type: String,
    },
    minimum_purchase_amount: {
      type: Number,
      default: 0,
      min: [0, "Minimum purchase target cannot be negative"],
    },
    discount_percentage: {
      type: Number,
      default: null,
      min: [0, "Discount value cannot be under 0%"],
      max: [100, "Discount value cannot surpass 100%"],
    },
    discount_value: {
      type: Number,
      default: null,
      min: [0, "Discount face value cannot be negative"],
    },
    free_quantity: {
      type: Number,
      default: 1,
      min: [1, "Free item allocation value must start at 1 if defined"],
    },
    max_free_quantity: {
      type: Number,
      default: 1,
      min: [1, "Maximum free limit pool must start at 1 if defined"],
    },
    redeem_time_hours: {
      type: Number,
      default: 24,
      min: [1, "Redemption validation window must be at least 1 hour"],
    },
    claim_limit: {
      type: Number,
    },
    per_user_limit: {
      type: Number,
      default: 1,
      min: [1, "Per user constraint threshold must allow at least 1 redemption"],
    },

    // --- GeoJSON Location Point Field ---
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },

    start_date: {
      type: Date,
      index: true,
    },
    end_date: {
      type: Date,
      index: true,
    },
    number_of_winners: {
      type: Number,
      default: null,
      min: [1, "Winner limit pool must start at 1 if defined"],
    },
    tags: {
      type: [String],
      index: true,
    },
    only_for_walk_in_customers: {
      type: Boolean,
      default: false,
    },
    qr_redemption_required: {
      type: Boolean,
      default: false,
    },
    show_to_users_nearby_only: {
      type: Boolean,
      default: false,
      index: true,
    },
    redeemedCount: {
      type: Number,
      default: 0,
    },
    claimedCount: {
      type: Number,
      default: 0,
    },

    // --- DRAFT CONTROL FIELDS ---
    is_draft: {
      type: Boolean,
      default: false,
      index: true,
    },
    draft_step: {
      type: Number,
      default: 1, // Step tracker for multi-stage creation wizards (e.g. 1, 2, 3)
    },

    is_active: {
      type: Boolean,
      default: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// --- Geospatial Index Configuration ---
offerSchema.index({ location: "2dsphere" });

// --- Composite Optimization Index (Excludes Drafts from Customer Searches) ---
offerSchema.index({
  is_draft: 1,
  is_active: 1,
  is_deleted: 1,
  start_date: 1,
  end_date: 1,
});

const Offer = mongoose.models.Offer || mongoose.model("Offer", offerSchema);
export default Offer;
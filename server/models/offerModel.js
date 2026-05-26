import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    merchant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      index: true,
    },
    // Structural layout options (banner, calendar, all)
    display_type: {
      type: String,
      enum: ["banner", "calendar", "all"],
      default: "all",
      index: true,
    },
    // Points to the flexible reward mechanics model (OfferType)
    offer_type_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OfferType",
      index: true,
    },
    // Added relational reference mapping to your standalone SubOfferType model
    sub_offer_type_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubOfferType",
      index: true,
    },
    // Modified from single ObjectId to an Array of ObjectIds
    product_id: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Product",
      index: true,
      default: []
    },
    title: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
    },
    thumbnail: {
      type: String, // Stores local server relative paths (e.g., "/uploads/filename.jpg")
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
      type: Number, // Absolute currency amounts saved for flat rules
      default: null,
      min: [0, "Discount face value cannot be negative"],
    },
    // Added: Free items given per baseline threshold rule (e.g., "Buy 2, Get [1] Free")
    free_quantity: {
      type: Number,
      default: 1,
      min: [1, "Free item allocation value must start at 1 if defined"]
    },
    // Added: Hard ceiling safety cap to prevent reward exploitation (e.g., "Max [3] free items per order")
    max_free_quantity: {
      type: Number,
      default: 1,
      min: [1, "Maximum free limit pool must start at 1 if defined"]
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
      type: Number, // Useful for limited coupon drops, raffles, or giveaways
      default: null,
      min: [1, "Winner limit pool must start at 1 if defined"],
    },
    tags: {
      type: [String],
      index: true,
    },
    // Targeted flags for brick-and-mortar setups vs app views
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
      index: true, // Speeds up geo-fenced discovery streams
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    }
  },
  {
    timestamps: true,
  }
);

// --- Composite Index Optimization ---
// Helps instantly locate valid, active campaigns running within a time window
offerSchema.index({ is_active: 1, is_deleted: 1, start_date: 1, end_date: 1 });

const Offer = mongoose.model("Offer", offerSchema);
export default Offer;
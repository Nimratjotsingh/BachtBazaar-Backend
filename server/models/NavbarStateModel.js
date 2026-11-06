import mongoose from "mongoose";

const userNavbarStateSchema = new mongoose.Schema(
  {
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Entity ID is required"],
      index: true,
    },
    entityType: {
      type: String,
      enum: ["User", "Merchant"],
      required: [true, "Entity type is required"],
      index: true,
    },
    
    // --- Delivery Navbar Indicator ---
    delivery: {
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DeliveryOrder",
        default: null,
      },
      isClosed: {
        type: Boolean,
        default: false, // True = hide from navbar, False = show indicator/badge
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },

    // --- Best Price Request Navbar Indicator ---
    bestPriceRequest: {
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BestPriceRequest",
        default: null,
      },
      isClosed: {
        type: Boolean,
        default: false,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },

    // --- Merchant Bid Navbar Indicator ---
    merchantBid: {
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MerchantBid",
        default: null,
      },
      isClosed: {
        type: Boolean,
        default: false,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },
  },
  {
    timestamps: true,
  }
);

// --- Compound Index for Fast Unique Lookups per Entity ---
userNavbarStateSchema.index({ entityId: 1, entityType: 1 }, { unique: true });

const  UserNavbarState =
  mongoose.models.UserNavbarState ||
  mongoose.model("UserNavbarState", userNavbarStateSchema);

export default UserNavbarState;
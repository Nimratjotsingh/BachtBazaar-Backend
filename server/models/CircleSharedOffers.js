import mongoose from "mongoose";

const circleSharedOfferSchema = new mongoose.Schema(
  {
    circleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BachatCircle",
      required: true,
      index: true,
    },
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
      required: true,
      index: true,
    },
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    // Visibility Scope: Either entire circle or selected members only
    visibilityType: {
      type: String,
      enum: ["ALL_MEMBERS", "SELECTED_MEMBERS"],
      default: "ALL_MEMBERS",
      required: true,
      index: true,
    },
    // Populated ONLY when visibilityType === "SELECTED_MEMBERS"
    visibleToMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true,
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Fast compound indexing for feed queries
circleSharedOfferSchema.index({ circleId: 1, isDeleted: 1, createdAt: -1 });

const CircleSharedOffer =
  mongoose.models.CircleSharedOffer ||
  mongoose.model("CircleSharedOffer", circleSharedOfferSchema);

export default CircleSharedOffer;
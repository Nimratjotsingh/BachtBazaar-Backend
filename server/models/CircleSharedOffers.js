import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reactionType: {
      type: String,
      enum: ["LIKE", "LOVE", "FIRE", "HUNDRED", "WOW", "STAR_STRUCK"],
      required: true,
    },
    reactedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

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
    visibilityType: {
      type: String,
      enum: ["ALL_MEMBERS", "SELECTED_MEMBERS"],
      default: "ALL_MEMBERS",
      required: true,
      index: true,
    },
    visibleToMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true,
      },
    ],
    reactions: [reactionSchema],
    reactionCounts: {
      LIKE: { type: Number, default: 0 },
      LOVE: { type: Number, default: 0 },
      FIRE: { type: Number, default: 0 },
      HUNDRED: { type: Number, default: 0 },
      WOW: { type: Number, default: 0 },
      STAR_STRUCK: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
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

circleSharedOfferSchema.index({ circleId: 1, isDeleted: 1, createdAt: -1 });

const CircleSharedOffer =
  mongoose.models.CircleSharedOffer ||
  mongoose.model("CircleSharedOffer", circleSharedOfferSchema);

export default CircleSharedOffer;
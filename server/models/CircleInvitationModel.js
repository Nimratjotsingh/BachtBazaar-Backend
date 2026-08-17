import mongoose from "mongoose";

const circleInvitationSchema = new mongoose.Schema(
  {
    circleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BachatCircle",
      required: true,
      index: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Target user phone number (e.g., "+919876543210" or "9876543210")
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    // Populated if user already exists at time of invitation
    invitedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    roleAssigned: {
      type: String,
      enum: ["CO_ADMIN", "MEMBER"],
      default: "MEMBER",
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7-day default validity
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent multiple pending invites for the exact same circle and phone number
circleInvitationSchema.index(
  { circleId: 1, phone: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "PENDING" } }
);

const CircleInvitation =
  mongoose.models.CircleInvitation ||
  mongoose.model("CircleInvitation", circleInvitationSchema);

export default CircleInvitation;
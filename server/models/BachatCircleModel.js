import mongoose from "mongoose";

const circleMemberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["ADMIN", "CO_ADMIN", "MEMBER"],
      default: "MEMBER",
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const bachatCircleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Circle name is required"],
      trim: true,
      maxlength: 60,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 250,
      default: "",
    },
    icon: {
      type: String,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    members: [circleMemberSchema],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup
bachatCircleSchema.index({ "members.userId": 1 });
bachatCircleSchema.index({ createdBy: 1, createdAt: -1 });

const BachatCircle =
  mongoose.models.BachatCircle ||
  mongoose.model("BachatCircle", bachatCircleSchema);

export default BachatCircle;
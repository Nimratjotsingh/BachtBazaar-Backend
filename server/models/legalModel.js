import mongoose from "mongoose";

const legalSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    content: {
      type: String,
      default: ""
    },

    type: {
      type: String,
      enum: ["Policy", "Terms", "EULA", "Disclaimer"],
      default: "Policy"
    },

    status: {
      type: String,
      enum: ["Draft", "Published"],
      default: "Draft"
    },

    // optional: track who edited (future use)
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin"
    }

  },
  { timestamps: true }
);

export default mongoose.model("Legal", legalSchema);
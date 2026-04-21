import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    value: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },

    label: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      default: ""
    },

    image: {
      type: String, // 👉 stores "/uploads/filename.jpg"
      default: ""
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Category", categorySchema);
import mongoose from "mongoose";

const subCategorySchema = new mongoose.Schema(
  {
    value: {
      type: String,
      required: true,
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

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true
    },

    image: {
      type: String, // 👉 "/uploads/filename.jpg"
      default: ""
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("SubCategory", subCategorySchema);
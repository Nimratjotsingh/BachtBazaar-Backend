import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  value: {
    type: String,
    required: true,
    unique: true
  },
  label: {
    type: String,
    required: true
  },
  description: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export default mongoose.model("Category", categorySchema);

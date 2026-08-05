import mongoose from "mongoose";

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "FAQ question is required."],
      trim: true,
    },
    answer: {
      type: String,
      required: [true, "FAQ answer is required."],
      trim: true,
    },
    // Optional Video Tutorial fields
    videoUrl: {
      type: String,
      trim: true,
      default: "", // e.g. "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    },
    videoDuration: {
      type: String,
      trim: true,
      default: "", // e.g. "2:30" or "1 min"
    },
    category: {
      type: String,
      enum: ["general", "account", "merchants", "offers", "payments", "orders"],
      default: "general",
      index: true,
    },
    targetAudience: {
      type: String,
      enum: ["all", "users", "merchants"],
      default: "all",
      index: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    is_published: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
    },
  },
  { timestamps: true }
);

faqSchema.index({ targetAudience: 1, category: 1, order: 1 });

const FAQ = mongoose.models.FAQ || mongoose.model("FAQ", faqSchema);

export default FAQ;
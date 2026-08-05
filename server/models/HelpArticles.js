import mongoose from "mongoose";

const helpArticleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Article title is required."],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true, // Clean URLs (e.g. /help/articles/how-to-claim-offer)
    },
    summary: {
      type: String,
      trim: true,
      default: "", // Short excerpt for search results and cards
    },
    content: {
      type: String,
      required: [true, "Article content is required."], // Supports HTML or Markdown
    },
    category: {
      type: String,
      enum: [
        "getting-started",
        "account-settings",
        "redemptions-and-claims",
        "merchant-onboarding",
        "payments-and-payouts",
        "troubleshooting",
      ],
      default: "getting-started",
      index: true,
    },
    targetAudience: {
      type: String,
      enum: ["all", "users", "merchants"],
      default: "all",
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    // Video tutorial attachment
    videoUrl: {
      type: String,
      trim: true,
      default: "",
    },
    videoDuration: {
      type: String,
      trim: true,
      default: "", // e.g. "3:45"
    },
    // Metrics & User Feedback
    views: {
      type: Number,
      default: 0,
    },
    helpfulVotes: {
      type: Number,
      default: 0,
    },
    unhelpfulVotes: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPublished: {
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

// Auto-generate slug from title (Async middleware without 'next')
helpArticleSchema.pre("validate", async function () {
  if (this.title && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, "") // Remove invalid characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-"); // Collapse consecutive hyphens
  }
});

// Full-text search index
helpArticleSchema.index({ title: "text", summary: "text", tags: "text" });

const HelpArticle =
  mongoose.models.HelpArticle ||
  mongoose.model("HelpArticle", helpArticleSchema);

export default HelpArticle;
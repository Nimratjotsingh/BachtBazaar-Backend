import mongoose from "mongoose";

const templateImageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
   
    url: {
      type: String,
    },

    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null, 
      index: true,
    },

    subcategory_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      default: null,
      index: true,
    },
    offertype_id:{
        type: mongoose.Schema.Types.ObjectId,
      ref: "OfferType",
      default: null,
      index: true,
    },
    // Useful for admin dashboard categorization (e.g., "Minimalist", "Festive", "Dark Mode")
    theme_style: {
      type: String,
      trim: true,
      lowercase: true,
    },
    // Admin dimensions/aspect ratio categorization (e.g., "16:9", "1:1", "horizontal_banner", "square")
    aspect_ratio: {
      type: String,
      trim: true,
    },
    // Tags for the search engine (e.g., ["diwali", "discount", "abstract", "neon"])
    tags: {
      type: [String],
      index: true,
    },
    // Usage tracker to monitor popularity among merchants
    use_count: {
      type: Number,
      default: 0,
    },
    // Quick visibility toggle for admins
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    }
  },
  { timestamps: true }
);

// Optimize database queries for fetching category-specific templates instantly
templateImageSchema.index({ category_id: 1, subcategory_id: 1, isActive: 1 });

const TemplateImage = mongoose.model("TemplateImage", templateImageSchema);
export default TemplateImage;
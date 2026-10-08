import mongoose from "mongoose";

const tagSuggestionSchema = new mongoose.Schema(
  {
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
    tags: {
      type: [
        {
          type: String,
          trim: true,
          lowercase: true,
        },
      ],
      validate: [
        (val) => Array.isArray(val) && val.length > 0,
        "At least one suggested tag is required",
      ],
      index: true,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure at least one classification reference is provided
tagSuggestionSchema.pre("validate", function () {
  if (!this.category_id && !this.subcategory_id) {
    throw new Error(
      "A TagSuggestion record must specify at least category_id or subcategory_id"
    );
  }
});

// Clean duplicates and empty entries before saving
tagSuggestionSchema.pre("save", function () {
  if (Array.isArray(this.tags)) {
    this.tags = [...new Set(this.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
  }
});

// Composite unique index to avoid duplicate mapping rules for the same combination
tagSuggestionSchema.index(
  { category_id: 1, subcategory_id: 1 },
  { unique: true }
);

const TagSuggestion =
  mongoose.models.TagSuggestion ||
  mongoose.model("TagSuggestion", tagSuggestionSchema);

export default TagSuggestion;
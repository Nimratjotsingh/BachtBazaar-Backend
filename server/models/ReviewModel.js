import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Discriminator: PRODUCT or SERVICE
    itemType: {
      type: String,
      enum: ["Product", "Service"],
      required: true,
      index: true,
    },
    // Polymorphic reference to either Product or Service
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "itemType",
      index: true,
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    // Customer uploaded review photos
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    // Verified Purchase or Completed Service flag
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
    // Upvotes / Likes on helpful reviews
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Official response from merchant/shop owner
    merchantReply: {
      comment: {
        type: String,
        trim: true,
        default: null,
      },
      repliedAt: {
        type: Date,
        default: null,
      },
    },
    status: {
      type: String,
      enum: ["published", "flagged", "hidden"],
      default: "published",
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Unique Index: One review per user per product/service
reviewSchema.index(
  { userId: 1, itemId: 1, itemType: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

// Compound Indexes for fast sorting and feed queries
reviewSchema.index({ itemId: 1, itemType: 1, status: 1, createdAt: -1 });
reviewSchema.index({ merchantId: 1, rating: -1 });

/**
 * Static method to calculate and update average rating & total reviews
 * directly on the parent Product or Service document.
 */
reviewSchema.statics.calculateAverageRating = async function (itemId, itemType) {
  const stats = await this.aggregate([
    {
      $match: {
        itemId: new mongoose.Types.ObjectId(itemId),
        itemType,
        status: "published",
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: "$itemId",
        avgRating: { $avg: "$rating" },
        numReviews: { $sum: 1 },
      },
    },
  ]);

  const targetModel = mongoose.model(itemType);

  if (stats.length > 0) {
    await targetModel.findByIdAndUpdate(itemId, {
      ratings: {
        average: Math.round(stats[0].avgRating * 10) / 10,
        count: stats[0].numReviews,
      },
    });
  } else {
    // Reset if all reviews were deleted
    await targetModel.findByIdAndUpdate(itemId, {
      ratings: {
        average: 0,
        count: 0,
      },
    });
  }
};

// Post-save hook: recalculate rating on review creation or update
reviewSchema.post("save", function () {
  this.constructor.calculateAverageRating(this.itemId, this.itemType);
});

// Post-remove / Post-findOneAndUpdate hook: update when a review is deleted or modified
reviewSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) {
    await doc.constructor.calculateAverageRating(doc.itemId, doc.itemType);
  }
});

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

export default Review;
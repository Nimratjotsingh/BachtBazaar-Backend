import mongoose from "mongoose";

const offerWishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One single wishlist document per user
      index: true,
    },
    offers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Offer",
      },
    ],
  },
  { timestamps: true }
);

const OfferWishlist =
  mongoose.models.OfferWishlist ||
  mongoose.model("OfferWishlist", offerWishlistSchema);

export default OfferWishlist;
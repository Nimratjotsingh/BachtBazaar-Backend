import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({
  data: Buffer,
  contentType: String
}, { _id: false });

const merchantShopSchema = new mongoose.Schema({
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Merchant",
    required: true,
    unique: true
  },
  shopName: {
    type: String,
    trim: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category"
  },
  subCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubCategory"
  },
  address: String,
  city: String,
  logo: imageSchema,
  banner: imageSchema,
  phone: String,
  description: String,
  openingHours: {
    type: Map,
    of: {
      open: String,
      close: String,
      isClosed: {
        type: Boolean,
        default: false
      }
    }
  }
}, { timestamps: true });

export default mongoose.model("MerchantShop", merchantShopSchema);

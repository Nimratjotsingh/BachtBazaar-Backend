import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({
  data: Buffer,
  contentType: String
}, { _id: false });

const merchantBusinessDocSchema = new mongoose.Schema({
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Merchant",
    required: true,
    unique: true
  },
  gstNumber: String,
  gstImage: imageSchema,
  tradeLicenseNumber: String,
  tradeLicenseImage: imageSchema,
  shopRegistrationNumber: String,
  shopRegistrationImage: imageSchema,
  fssaiNumber: String,
  fssaiImage: imageSchema,
  panNumber: String,
  panImage: imageSchema
}, { timestamps: true });

export default mongoose.model("MerchantBusinessDoc", merchantBusinessDocSchema);

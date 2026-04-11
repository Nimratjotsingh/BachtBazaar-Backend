import mongoose from "mongoose";

const merchantRegistrationSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true
  },
  hashedPassword: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }
  }
}, { timestamps: true });

export default mongoose.model("MerchantRegistration", merchantRegistrationSchema);

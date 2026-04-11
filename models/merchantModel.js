import mongoose from "mongoose";
import { ROLES } from "../constants/roles.js";

const imageSchema = new mongoose.Schema({
  data: Buffer,
  contentType: String
}, { _id: false });

const merchantSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String
  },

  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: [ROLES.MERCHANT, ROLES.SUPER_ADMIN],
    default: ROLES.MERCHANT
  },

  name: String,

  gender: {
    type: String,
    enum: ["male", "female", "other"]
  },

  city: String,

  profileImage: {
    type: imageSchema,
    default: {}
  },

  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
}, { timestamps: true });


export default mongoose.model("Merchant", merchantSchema);
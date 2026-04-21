import mongoose from "mongoose";
import { ROLES } from "../constants/roles.js";

const userSchema=new mongoose.Schema({
  phone: {
    type:String,
    required:true,
    unique:true
  },
  password: {
    type:String
  },
  isVerified: {
    type:Boolean,
    default:false
  },
  role: {
    type: String,
    enum: [ROLES.USER, ROLES.SUPER_ADMIN],
    default: ROLES.USER
  },
   name: {
    type: String
  },
  gender: {
    type: String,
    enum: ["male", "female", "other"]
  },
  address: {
    type: String
  },
  email:{
    unique: true,
    type: String
  },
  profileImage: {
    data: Buffer,
    contentType: String
  },
  status: {
    type: String,
    enum: ["active", "banned"],
    default: "active"
  }
}, { timestamps:true });

export default mongoose.model("User",userSchema);
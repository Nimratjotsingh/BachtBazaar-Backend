import mongoose from "mongoose";

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
  profileImage: {
    data: Buffer,
    contentType: String
  }
}, { timestamps:true });

export default mongoose.model("User",userSchema);
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    process.env.NODE_ENV === "development" && console.log("Existing Mongo DB URI:", process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("mongoDB connected");
  } catch (error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] DB Connection Error: ${error.message}`);
    console.error(`[${timestamp}] Stack: ${error.stack}`);
    process.exit(1);
  }
};

export default connectDB;
import mongoose from "mongoose";
import { initCronJobs } from '../jobs/cron.js';
const connectDB = async () => {
  try {
    process.env.NODE_ENV === "development" && console.log("Existing Mongo DB URI:", process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    process.env.NODE_ENV === "development" && console.log("mongoDB connected");
    initCronJobs();
  } catch (error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] DB Connection Error: ${error.message}`);
    console.error(`[${timestamp}] Stack: ${error.stack}`);
    process.exit(1);
  }
};

export default connectDB;
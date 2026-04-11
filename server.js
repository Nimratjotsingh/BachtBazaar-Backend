import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import merchantAuthRoutes from "./routes/merchantAuthRoutes.js";
import merchantProfileRoutes from "./routes/merchantProfileRoutes.js";
import merchantPersonalDocRoutes from "./routes/merchantPersonalDocRoutes.js";
import merchantBusinessDocRoutes from "./routes/merchantBusinessDocRoutes.js";
import merchantShopRoutes from "./routes/merchantShopRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();
// console.log(process.env.MONGO_URI)

const app = express();
const isDevelopment = (process.env.NODE_ENV || "")
  .trim()
  .toLowerCase()
  .startsWith("development");

connectDB();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

if (isDevelopment) {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

app.use("/api/user", userRoutes);
app.use("/api/merchant/auth", merchantAuthRoutes);
app.use("/api/merchant/profile", merchantProfileRoutes);
app.use("/api/merchant/personal-docs", merchantPersonalDocRoutes);
app.use("/api/merchant/business-docs", merchantBusinessDocRoutes);
app.use("/api/merchant/shop", merchantShopRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/admin", adminRoutes);

app.get("/health", (req, res) => {
  res.json({ message: "Server is healthy!" });
});

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Unhandled error:`, err.message);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(isDevelopment && { stack: err.stack })
  });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
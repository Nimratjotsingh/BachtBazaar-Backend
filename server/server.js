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
import profileRoutes from "./routes/profileRoutes.js";
import kycRoutes from "./routes/kycRoutes.js";
import seedAdmin from "./scripts/seedAdmin.js";
import superAuth from './routes/superAuthRoute.js';
import subCategory from './routes/subCategoryRoutes.js';
import legal from './routes/legalRoutes.js';
import path from "path";
import product from './routes/productRoutes.js';
import service from './routes/serviceRoutes.js';
import userHome from './routes/userHomeRoutes.js';
import offerType from './routes/offerTypeRoutes.js';
import templateRoute from './routes/templateRoutes.js';
import calenderRoutes from './routes/calenderConfigRoutes.js';
import { fileURLToPath } from "url";
import offerRoutes from './routes/offerRoutes.js'
import openai from './routes/openaiRoutes.js';

dotenv.config();
// console.log(process.env.MONGO_URI)


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT) || 5001;
const isDevelopment = (process.env.NODE_ENV || "")
  .trim()
  .toLowerCase()
  .startsWith("development");

connectDB();

app.use(cors(
  {origin: 'http://localhost:5173'}
));
app.use(express.urlencoded({extended: true}))
app.use(express.json());
app.use("/uploads", express.static("public/uploads"));


if (isDevelopment) {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// User routes (support both singular and plural paths)
app.use("/api/user", userRoutes);
app.use("/api/users", userRoutes);
app.use('/api/subcategories',subCategory)
app.use('/api/merchant/products',product);
app.use('/api/merchant/services',service);
app.use('/api/users/shop',userHome);
// Merchant routes (support both legacy and new paths)
app.use("/api/merchant/auth", merchantAuthRoutes);
app.use("/api/merchants", merchantAuthRoutes);
app.use('/api/super-admin',superAuth);
app.use('/api/legal',legal)
app.use("/api/merchant/profile", merchantProfileRoutes);
app.use("/api/merchants/profile", merchantProfileRoutes);
app.use("/api/merchant/personal-docs", merchantPersonalDocRoutes);
app.use("/api/merchants/personal-docs", merchantPersonalDocRoutes);
app.use("/api/merchant/business-docs", merchantBusinessDocRoutes);
app.use("/api/merchants/business-docs", merchantBusinessDocRoutes);
app.use("/api/merchant/shop", merchantShopRoutes);
app.use("/api/merchants/shop", merchantShopRoutes);
app.use("/api/categories", categoryRoutes);
app.use('/api/offer-types', offerType)
app.use("/api/admin", adminRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/kyc", kycRoutes);
app.use('/api/templates',templateRoute);
app.use('/api/calendar-config', calenderRoutes);
app.use('/api/offers',offerRoutes);
app.use('/api/ai',openai)

app.get("/health", (req, res) => {
  res.json({ message: "Server is healthy!" });
});

// ESM Route Debug Function
function printRoutes(app) {
  console.log('=== ALL REGISTERED ROUTES ===');
  
  // Method 1: Direct route check
  app._router.stack.forEach((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
      console.log(`${methods.join(', ')} ${layer.route.path}`);
    }
  });
  
  console.log('=== END ROUTES ===');
}
// Handle unknown routes
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: `Route not found: ${req.method} ${req.originalUrl}`
//   });
// });

app.use(express.static(path.join(__dirname, "../dist")));

// SPA fallback LAST
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
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

app.listen(PORT, () => {
  seedAdmin();
  console.log(`Server running on port ${PORT}`);
});
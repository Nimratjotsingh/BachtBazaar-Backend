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

dotenv.config();
console.log(process.env.MONGO_URI)

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/user", userRoutes);
app.use("/api/merchant/auth", merchantAuthRoutes);
app.use("/api/merchant/profile", merchantProfileRoutes);
app.use("/api/merchant/personal-docs", merchantPersonalDocRoutes);
app.use("/api/merchant/business-docs", merchantBusinessDocRoutes);
app.use("/api/merchant/shop", merchantShopRoutes);
app.use("/api/categories", categoryRoutes);

app.get("/health", (req, res) => {
  res.json({ message: "Server is healthy!" });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
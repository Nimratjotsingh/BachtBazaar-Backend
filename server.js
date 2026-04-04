import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import connectDB from "./config/db.js";

import userRoutes from "./routes/userRoutes.js";
import merchantRoutes from "./routes/merchantRoutes.js";

dotenv.config();

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/user", userRoutes);
app.use("/api/merchant", merchantRoutes);

app.get("/health", (req, res) => {
  res.json({ message: "Server is healthy!" });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
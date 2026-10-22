import express from "express";
import { 
  createBestPriceRequest, 
  getUserBestPriceRequests, 
  cancelBestPriceRequest, 
  updateBestPriceRequest,
  deleteBestPriceRequest,
  closeBestPriceRequest
} from "../controllers/BestPriceRequestController.js";
import { protectUser as protect } from "../middleware/authMiddleware.js"; // Replace with your standard token decode middleware path
import upload from '../middleware/uploadSec.js'

const router = express.Router();

// All resource nodes here run behind your authentication gates
router.post("/create", protect, upload.array("images",5),createBestPriceRequest);
router.get("/my-requests", protect, getUserBestPriceRequests);
router.put("/cancel/:id", protect, cancelBestPriceRequest);
router.put("/edit/:id", protect, upload.array("images",5),updateBestPriceRequest);
router.delete("/delete/:id", protect, deleteBestPriceRequest);
router.put('/close/:id',protect,closeBestPriceRequest)

export default router;
import express from "express";
import {
  createDeliveryOrder,
  cancelDeliveryOrder,
  respondToDeliveryOrder,
  updateDeliveryOrderStatus,
  getMerchantDeliveryOrders,
  getDeliveryOrderById,
  getDeliveryOrders,
  getUserDeliveryFeeEstimate,
} from "../controllers/deliveryController.js";
import { protectUser, protectMerchant } from "../middleware/authMiddleware.js";

const router = express.Router();

// User Routes

router.get("/estimate-fee", protectUser, getUserDeliveryFeeEstimate);
router.post("/user/delivery-orders", protectUser, createDeliveryOrder);
router.patch("/user/delivery-orders/:orderId/cancel", protectUser, cancelDeliveryOrder);
router.get("/user/delivery-orders/:orderId", protectUser, getDeliveryOrderById);
router.get("/user/delivery-orders", protectUser, getDeliveryOrders);

// Merchant Routes
router.get("/merchant/delivery-orders", protectMerchant, getMerchantDeliveryOrders);
router.patch("/merchant/delivery-orders/:orderId/respond", protectMerchant, respondToDeliveryOrder);
router.patch("/merchant/delivery-orders/:orderId/status", protectMerchant, updateDeliveryOrderStatus);

export default router;
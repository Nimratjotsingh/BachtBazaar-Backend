import express from "express";
import {
  createDeliveryOrder,
  cancelDeliveryOrder,
  respondToDeliveryOrder,
  updateDeliveryOrderStatus,
  getMerchantDeliveryOrders,
} from "../controllers/deliveryController.js";
import { protectUser, protectMerchant } from "../middleware/authMiddleware.js";

const router = express.Router();

// User Routes
router.post("/delivery-orders", protectUser, createDeliveryOrder);
router.patch("/delivery-orders/:orderId/cancel", protectUser, cancelDeliveryOrder);

// Merchant Routes
router.get("/merchant/delivery-orders", protectMerchant, getMerchantDeliveryOrders);
router.patch("/merchant/delivery-orders/:orderId/respond", protectMerchant, respondToDeliveryOrder);
router.patch("/merchant/delivery-orders/:orderId/status", protectMerchant, updateDeliveryOrderStatus);

export default router;
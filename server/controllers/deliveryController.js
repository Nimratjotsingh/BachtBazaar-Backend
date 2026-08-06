import DeliveryOrder from "../models/deliveryModel.js";
import Merchant from "../models/merchantModel.js";
import User from "../models/userModel.js";
import Product from "../models/productModel.js";

// ==========================================
// 1. USER ENDPOINTS
// ==========================================

/**
 * POST /api/delivery-orders
 * User creates a new delivery request featuring product/item details
 */
export const createDeliveryOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      merchantId,
      productId,
      customItemName,
      quantity = 1,
      variantInfo,
      itemPrice,
      note,
      deliveryAddress,
      contactPhone,
      estimatedMinutes, // Optional custom time request from user
    } = req.body;

    if (!merchantId) {
      return res.status(400).json({
        success: false,
        message: "Merchant ID is required.",
      });
    }

    // 1. Verify Merchant exists and has delivery enabled
    const merchant = await Merchant.findById(merchantId);
    if (!merchant || merchant.isBlocked) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found or inactive.",
      });
    }

    if (!merchant.isDeliveryEnabled) {
      return res.status(400).json({
        success: false,
        message: "This merchant currently does not offer delivery services.",
      });
    }

    // 2. Resolve Product Details
    let resolvedProductName = customItemName || "Custom Item";
    let unitPrice = 0;
    let thumbnail = "";
    let finalProductId = null;

    if (productId) {
      const dbProduct = await Product.findById(productId);
      if (!dbProduct || dbProduct.is_deleted) {
        return res.status(404).json({
          success: false,
          message: "Selected product is unavailable or deleted.",
        });
      }

      finalProductId = dbProduct._id;
      resolvedProductName = dbProduct.title || dbProduct.name;
      unitPrice = dbProduct.price || dbProduct.discount_price || Number(itemPrice) || 0;
      thumbnail = dbProduct.thumbnail || dbProduct.image || "";
    } else {
      if (!itemPrice) {
        return res.status(400).json({
          success: false,
          message: "Item price is required when creating a custom item delivery request.",
        });
      }
      unitPrice = Number(itemPrice);
    }

    const orderQuantity = Math.max(1, Number(quantity));
    const totalItemPrice = unitPrice * orderQuantity;

    // 3. Resolve User Address and Contact Phone
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User record not found." });
    }

    const finalAddress = deliveryAddress || user.address;
    const finalPhone = contactPhone || user.phone || user.mobile;

    if (!finalAddress || !finalAddress.street || !finalAddress.city) {
      return res.status(400).json({
        success: false,
        message: "Complete delivery address (street and city) is required.",
      });
    }

    if (!finalPhone) {
      return res.status(400).json({
        success: false,
        message: "Contact phone number is required.",
      });
    }

    // 4. Calculate Constant Fees from .env
    const deliveryFee = Number(process.env.DEFAULT_DELIVERY_FEE) || 30;
    const platformFee = Number(process.env.DEFAULT_PLATFORM_FEE) || 10;
    const totalAmount = totalItemPrice + deliveryFee + platformFee;

    // 5. Construct and Save Order
    const newOrder = new DeliveryOrder({
      userId,
      merchantId,
      productId: finalProductId,
      productDetails: {
        productName: resolvedProductName,
        quantity: orderQuantity,
        unitPrice,
        productThumbnail: thumbnail,
        variantInfo: variantInfo || "",
      },
      deliveryAddress: finalAddress,
      contactPhone: finalPhone,
      note: note ? note.trim() : "",
      itemPrice: totalItemPrice,
      deliveryFee,
      platformFee,
      totalAmount,
      estimatedDeliveryTime: {
        value: Number(estimatedMinutes) || 30,
        unit: "minutes",
      },
      status: "pending",
    });

    await newOrder.save();

    return res.status(201).json({
      success: true,
      message: "Delivery request submitted successfully with item details.",
      data: newOrder,
    });
  } catch (error) {
    console.error("Create Delivery Order Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create delivery order.",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/delivery-orders/:orderId/cancel
 * User cancels their request BEFORE merchant accepts it
 */
export const cancelDeliveryOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const { orderId } = req.params;
    const { cancelReason } = req.body;

    const order = await DeliveryOrder.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({ success: false, message: "Delivery order not found." });
    }

    // Strictly enforce cancellation ONLY before merchant accepts
    if (order.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order. The order is already '${order.status}'. Cancellation is only permitted while status is pending.`,
      });
    }

    order.status = "canceled_by_user";
    order.cancelReason = cancelReason || "Canceled by user prior to merchant acceptance.";
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Delivery order canceled successfully.",
      data: order,
    });
  } catch (error) {
    console.error("Cancel Delivery Order Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel delivery order.",
      error: error.message,
    });
  }
};

// ==========================================
// 2. MERCHANT ENDPOINTS
// ==========================================

/**
 * PATCH /api/merchant/delivery-orders/:orderId/respond
 * Merchant accepts or declines a pending delivery request and sets estimated delivery time
 */
export const respondToDeliveryOrder = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { orderId } = req.params;
    const { action, declineReason, estimatedMinutes, timeUnit = "minutes" } = req.body; // action: "accept" or "decline"

    if (!["accept", "decline"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Expected 'accept' or 'decline'.",
      });
    }

    const order = await DeliveryOrder.findOne({ _id: orderId, merchantId });

    if (!order) {
      return res.status(404).json({ success: false, message: "Delivery order not found." });
    }

    if (order.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Order cannot be modified. Current status is '${order.status}'.`,
      });
    }

    if (action === "accept") {
      order.status = "accepted";

      // Set estimated delivery duration and calculate expected date/time
      const durationValue = Number(estimatedMinutes) || order.estimatedDeliveryTime?.value || 30;
      order.estimatedDeliveryTime = {
        value: durationValue,
        unit: timeUnit,
      };

      const now = new Date();
      let multiplier = 60000; // minutes to ms
      if (timeUnit === "hours") multiplier = 3600000;
      if (timeUnit === "days") multiplier = 86400000;

      order.expectedDeliveryAt = new Date(now.getTime() + durationValue * multiplier);
    } else {
      order.status = "declined";
      order.declineReason = declineReason || "Declined by merchant.";
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: `Delivery order ${action}ed successfully.`,
      data: order,
    });
  } catch (error) {
    console.error("Respond To Delivery Order Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update order response.",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/merchant/delivery-orders/:orderId/status
 * Merchant updates delivery progress, payment status, and optional delivery time adjustment
 */
export const updateDeliveryOrderStatus = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { orderId } = req.params;
    const { status, paymentStatus, estimatedMinutes, timeUnit = "minutes" } = req.body;

    const order = await DeliveryOrder.findOne({ _id: orderId, merchantId });

    if (!order) {
      return res.status(404).json({ success: false, message: "Delivery order not found." });
    }

    if (status) {
      const allowedStatuses = ["dispatched", "delivered"];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status update. Allowed values: 'dispatched', 'delivered'.",
        });
      }
      order.status = status;
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }

    // Optional ETA updates mid-fulfillment
    if (estimatedMinutes) {
      const durationValue = Number(estimatedMinutes);
      order.estimatedDeliveryTime = {
        value: durationValue,
        unit: timeUnit,
      };

      const now = new Date();
      let multiplier = 60000;
      if (timeUnit === "hours") multiplier = 3600000;
      if (timeUnit === "days") multiplier = 86400000;

      order.expectedDeliveryAt = new Date(now.getTime() + durationValue * multiplier);
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Delivery order status updated successfully.",
      data: order,
    });
  } catch (error) {
    console.error("Update Delivery Order Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update delivery status.",
      error: error.message,
    });
  }
};

/**
 * GET /api/merchant/delivery-orders
 * Merchant fetches incoming delivery requests populated with product details
 */
export const getMerchantDeliveryOrders = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { status } = req.query;

    const query = { merchantId };
    if (status) query.status = status;

    const orders = await DeliveryOrder.find(query)
      .populate("userId", "name phone email")
      .populate("productId", "title thumbnail category_id")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      total: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("Get Merchant Delivery Orders Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve delivery orders.",
      error: error.message,
    });
  }
};
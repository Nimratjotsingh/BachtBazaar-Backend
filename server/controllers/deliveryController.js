import DeliveryOrder from "../models/deliveryModel.js";
import Merchant from "../models/merchantModel.js";
import User from "../models/userModel.js";
import Product from "../models/productModel.js";
import { sendDeliveryNotification } from "../utils/deliveryNotificationHelper.js";

// ==========================================
// 1. USER ENDPOINTS
// ==========================================

export const createDeliveryOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      merchantId,
      items,
      productId,
      customItemName,
      quantity = 1,
      variantInfo,
      itemPrice,
      note,
      deliveryAddress,
      contactPhone,
      estimatedMinutes,
    } = req.body;

    if (!merchantId) {
      return res.status(400).json({
        success: false,
        message: "Merchant ID is required.",
      });
    }

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

    let rawItemsList = [];
    if (Array.isArray(items) && items.length > 0) {
      rawItemsList = items;
    } else {
      rawItemsList = [
        {
          productId,
          productName: customItemName,
          quantity,
          unitPrice: itemPrice,
          variantInfo,
        },
      ];
    }

    const resolvedItems = [];
    for (const rawItem of rawItemsList) {
      let resolvedName = rawItem.productName || rawItem.customItemName || "Custom Item";
      let resolvedUnitPrice = Number(rawItem.unitPrice || rawItem.itemPrice) || 0;
      let thumbnail = rawItem.productThumbnail || "";
      let finalProductId = null;

      if (rawItem.productId) {
        const dbProduct = await Product.findById(rawItem.productId);
        if (dbProduct && !dbProduct.is_deleted) {
          finalProductId = dbProduct._id;
          resolvedName = dbProduct.title || dbProduct.name || resolvedName;
          resolvedUnitPrice =
            dbProduct.discount_price || dbProduct.price || resolvedUnitPrice;
          thumbnail = dbProduct.thumbnail || dbProduct.image || thumbnail;
        }
      }

      const itemQty = Math.max(1, Number(rawItem.quantity) || 1);
      resolvedItems.push({
        productId: finalProductId,
        productName: resolvedName,
        quantity: itemQty,
        unitPrice: resolvedUnitPrice,
        productThumbnail: thumbnail,
        variantInfo: rawItem.variantInfo || "",
        itemTotal: resolvedUnitPrice * itemQty,
      });
    }

    if (resolvedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one valid item is required to create a delivery order.",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User record not found." });
    }

    const finalAddress = deliveryAddress || user.address;
    const finalPhone = contactPhone || user.phone || user.mobile;

    const deliveryFee = Number(process.env.DEFAULT_DELIVERY_FEE) || 30;
    const platformFee = Number(process.env.DEFAULT_PLATFORM_FEE) || 10;

    const newOrder = new DeliveryOrder({
      userId,
      merchantId,
      items: resolvedItems,
      deliveryAddress: finalAddress,
      contactPhone: finalPhone,
      note: note ? note.trim() : "",
      deliveryFee,
      platformFee,
      estimatedDeliveryTime: {
        value: Number(estimatedMinutes) || 30,
        unit: "minutes",
      },
      status: "pending",
    });

    await newOrder.save();

    // Notify Merchant of new incoming delivery order
    sendDeliveryNotification({
      recipientType: "Merchant",
      recipientId: merchantId,
      title: "📦 New Delivery Order Received!",
      body: `${user.name || "A customer"} placed an order with ${resolvedItems.length} item(s). Tap to review and accept.`,
      type: "DELIVERY_ORDER_NEW",
      orderId: newOrder._id,
      extraData: {
        totalItems: resolvedItems.length,
        customerName: user.name || "Customer",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Delivery request submitted successfully.",
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

export const cancelDeliveryOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const { orderId } = req.params;
    const { cancelReason } = req.body;

    const order = await DeliveryOrder.findOne({ _id: orderId, userId });
    if (!order) {
      return res.status(404).json({ success: false, message: "Delivery order not found." });
    }

    if (order.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order. The order is already '${order.status}'. Cancellation is only permitted while status is pending.`,
      });
    }

    order.status = "canceled_by_user";
    order.cancelReason = cancelReason || "Canceled by user prior to merchant acceptance.";
    await order.save();

    // Notify Merchant that customer canceled the pending request
    sendDeliveryNotification({
      recipientType: "Merchant",
      recipientId: order.merchantId,
      title: "❌ Delivery Order Canceled",
      body: `Customer canceled Order #${order._id.toString().slice(-6)}.`,
      type: "DELIVERY_ORDER_CANCELED",
      orderId: order._id,
      extraData: { cancelReason: order.cancelReason },
    });

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

export const respondToDeliveryOrder = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { orderId } = req.params;
    const { action, declineReason, estimatedMinutes, timeUnit = "minutes" } = req.body;

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

    const merchant = await Merchant.findById(merchantId).select("name shop_name");
    const shopDisplayName = merchant?.shop_name || merchant?.name || "The store";

    if (action === "accept") {
      order.status = "accepted";
      const durationValue = Number(estimatedMinutes) || order.estimatedDeliveryTime?.value || 30;
      order.estimatedDeliveryTime = { value: durationValue, unit: timeUnit };

      const now = new Date();
      let multiplier = 60000;
      if (timeUnit === "hours") multiplier = 3600000;
      if (timeUnit === "days") multiplier = 86400000;

      order.expectedDeliveryAt = new Date(now.getTime() + durationValue * multiplier);

      // Notify User: Order Accepted
      sendDeliveryNotification({
        recipientType: "User",
        recipientId: order.userId,
        title: "✅ Order Accepted!",
        body: `${shopDisplayName} accepted your order! Estimated delivery in ~${durationValue} ${timeUnit}.`,
        type: "DELIVERY_ORDER_ACCEPTED",
        orderId: order._id,
        extraData: {
          estimatedTime: `${durationValue} ${timeUnit}`,
          expectedDeliveryAt: order.expectedDeliveryAt.toISOString(),
        },
      });
    } else {
      order.status = "declined";
      order.declineReason = declineReason || "Declined by merchant.";

      // Notify User: Order Declined
      sendDeliveryNotification({
        recipientType: "User",
        recipientId: order.userId,
        title: "⚠️ Order Declined",
        body: `${shopDisplayName} could not accept your order: ${order.declineReason}`,
        type: "DELIVERY_ORDER_DECLINED",
        orderId: order._id,
        extraData: { declineReason: order.declineReason },
      });
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

    if (estimatedMinutes) {
      const durationValue = Number(estimatedMinutes);
      order.estimatedDeliveryTime = { value: durationValue, unit: timeUnit };

      const now = new Date();
      let multiplier = 60000;
      if (timeUnit === "hours") multiplier = 3600000;
      if (timeUnit === "days") multiplier = 86400000;

      order.expectedDeliveryAt = new Date(now.getTime() + durationValue * multiplier);
    }

    await order.save();

    const merchant = await Merchant.findById(merchantId).select("name shop_name");
    const shopDisplayName = merchant?.shop_name || merchant?.name || "The store";

    // Notify User on status progression
    if (status === "dispatched") {
      sendDeliveryNotification({
        recipientType: "User",
        recipientId: order.userId,
        title: "🛵 Order Dispatched!",
        body: `Your order from ${shopDisplayName} is out for delivery!`,
        type: "DELIVERY_ORDER_DISPATCHED",
        orderId: order._id,
      });
    } else if (status === "delivered") {
      sendDeliveryNotification({
        recipientType: "User",
        recipientId: order.userId,
        title: "🎉 Order Delivered!",
        body: `Your order from ${shopDisplayName} has been delivered. Enjoy your purchase!`,
        type: "DELIVERY_ORDER_DELIVERED",
        orderId: order._id,
      });
    }

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

export const getMerchantDeliveryOrders = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { status } = req.query;

    const query = { merchantId };
    if (status) query.status = status;

    const orders = await DeliveryOrder.find(query)
      .populate("userId", "name phone email")
      .populate("items.productId", "title thumbnail category_id price")
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

export const getDeliveryOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?._id;
    const merchantId = req.merchant?._id;

    const accessQuery = { _id: orderId };
    if (userId) accessQuery.userId = userId;
    else if (merchantId) accessQuery.merchantId = merchantId;

    const order = await DeliveryOrder.findOne(accessQuery)
      .populate("userId", "name phone email")
      .populate("merchantId", "name shop_name phone logo address")
      .populate("items.productId", "title thumbnail category_id price")
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Delivery order not found or access denied.",
      });
    }

    const isCompleted = order.status === "delivered";
    const isCanceledOrDeclined = ["declined", "canceled_by_user"].includes(order.status);

    let minutesRemaining = null;
    if (order.expectedDeliveryAt && !isCompleted && !isCanceledOrDeclined) {
      const now = new Date();
      const expected = new Date(order.expectedDeliveryAt);
      const diffMs = expected.getTime() - now.getTime();
      minutesRemaining = Math.max(0, Math.ceil(diffMs / 60000));
    }

    return res.status(200).json({
      success: true,
      data: {
        ...order,
        trackingMeta: {
          isCompleted,
          isCanceledOrDeclined,
          minutesRemaining,
        },
      },
    });
  } catch (error) {
    console.error("Get Delivery Order By ID Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve delivery order status.",
      error: error.message,
    });
  }
};

export const getDeliveryOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    const query = { userId };
    if (status) query.status = status;

    const orders = await DeliveryOrder.find(query)
      .populate("merchantId", "name shop_name phone logo address")
      .populate("items.productId", "title thumbnail category_id price")
      .sort({ createdAt: -1 })
      .lean();

    const formattedOrders = orders.map((order) => {
      const isCompleted = order.status === "delivered";
      const isCanceledOrDeclined = ["declined", "canceled_by_user"].includes(order.status);

      let minutesRemaining = null;
      if (order.expectedDeliveryAt && !isCompleted && !isCanceledOrDeclined) {
        const now = new Date();
        const expected = new Date(order.expectedDeliveryAt);
        const diffMs = expected.getTime() - now.getTime();
        minutesRemaining = Math.max(0, Math.ceil(diffMs / 60000));
      }

      return {
        ...order,
        trackingMeta: {
          isCompleted,
          isCanceledOrDeclined,
          minutesRemaining,
        },
      };
    });

    return res.status(200).json({
      success: true,
      total: formattedOrders.length,
      data: formattedOrders,
    });
  } catch (error) {
    console.error("Get User Delivery Orders Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve user delivery orders.",
      error: error.message,
    });
  }
};
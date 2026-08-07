import DeliveryOrder from "../models/deliveryModel.js";
import Merchant from "../models/merchantModel.js";
import User from "../models/userModel.js";
import Product from "../models/productModel.js";

// ==========================================
// 1. USER ENDPOINTS
// ==========================================

/**
 * POST /api/delivery-orders
 * User creates a new delivery request with single or multiple products/items
 */
export const createDeliveryOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      merchantId,
      items, // Expecting array: [{ productId, productName, quantity, unitPrice, variantInfo }]
      // Fallback single-item parameters
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

    // 2. Standardize multi-item vs single-item request payload
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

    // 3. Resolve each item in the array
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

    // 4. Resolve User Address and Contact Phone
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User record not found." });
    }

    const finalAddress = deliveryAddress || user.address;
    const finalPhone = contactPhone || user.phone || user.mobile;

    // if (!finalAddress || !finalAddress.street || !finalAddress.city) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Complete delivery address (street and city) is required.",
    //   });
    // }

    // if (!finalPhone) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Contact phone number is required.",
    //   });
    // }

    // 5. Calculate Fees from .env
    const deliveryFee = Number(process.env.DEFAULT_DELIVERY_FEE) || 30;
    const platformFee = Number(process.env.DEFAULT_PLATFORM_FEE) || 10;

    // 6. Construct Order (pre-save hook will automatically update itemPrice & totalAmount)
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
 * Merchant accepts or declines a pending delivery request
 */
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

    if (action === "accept") {
      order.status = "accepted";

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
 * Merchant updates delivery progress and payment status
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
 * Merchant fetches incoming delivery requests populated with product items
 */
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

/**
 * GET /api/delivery-orders/:orderId
 * Fetch full details and live status of a specific delivery order
 * Accessible by both the user who placed it or the merchant fulfilling it
 */
export const getDeliveryOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?._id;
    const merchantId = req.merchant?._id;

    // 1. Build access query (must match either the user or the merchant)
    const accessQuery = { _id: orderId };
    if (userId) {
      accessQuery.userId = userId;
    } else if (merchantId) {
      accessQuery.merchantId = merchantId;
    }

    // 2. Query order with populated references
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

    // 3. Compute live status metadata for dynamic UI tracking
    const isCompleted = order.status === "delivered";
    const isCanceledOrDeclined = ["declined", "canceled_by_user"].includes(order.status);
    
    // Calculate remaining estimated delivery time in minutes if active
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
    if (status) {
      query.status = status;
    }

    const orders = await DeliveryOrder.find(query)
      .populate("merchantId", "name shop_name phone logo address")
      .populate("items.productId", "title thumbnail category_id price")
      .sort({ createdAt: -1 })
      .lean();

    // Map tracking metadata across all retrieved orders
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
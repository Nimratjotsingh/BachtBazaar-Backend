import DeliveryOrder from "../models/deliveryModel.js";
import Merchant from "../models/merchantModel.js";
import MerchantShop from "../models/merchantShopModel.js";
import User from "../models/userModel.js";
import Product from "../models/productModel.js";
import { sendDeliveryNotification } from "../utils/deliveryNotificationHelper.js";

// ==========================================
// PRICING CALCULATION HELPERS
// ==========================================

const isTimeInWindow = (startTime, endTime, targetDate = new Date()) => {
  if (!startTime || !endTime) return false;

  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  const currentMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();
  const windowStart = startHour * 60 + startMin;
  const windowEnd = endHour * 60 + endMin;

  if (windowStart <= windowEnd) {
    return currentMinutes >= windowStart && currentMinutes <= windowEnd;
  }
  return currentMinutes >= windowStart || currentMinutes <= windowEnd;
};

const calculateDeliveryFee = (pricingConfig = {}, distanceKm = 1, orderDate = new Date()) => {
  const baseFee = pricingConfig.baseFee ?? 20;
  const standardRate = pricingConfig.ratePerKm ?? 10;
  const minimumFee = pricingConfig.minimumDeliveryFee ?? 20;

  const night = pricingConfig.nightConfig || {};
  const peak = pricingConfig.peakConfig || {};

  let appliedRate = standardRate;
  let flatSurcharge = 0;
  let tierApplied = "STANDARD";

  if (night.isEnabled && isTimeInWindow(night.startTime, night.endTime, orderDate)) {
    appliedRate = night.ratePerKm ?? standardRate;
    flatSurcharge = night.flatSurcharge ?? 0;
    tierApplied = "NIGHT";
  } else if (peak.isEnabled && isTimeInWindow(peak.startTime, peak.endTime, orderDate)) {
    appliedRate = peak.ratePerKm ?? standardRate;
    flatSurcharge = peak.flatSurcharge ?? 0;
    tierApplied = "PEAK";
  }

  const rawFee = (distanceKm * appliedRate) + baseFee + flatSurcharge;
  const deliveryFee = Math.max(minimumFee, Math.round(rawFee));

  return {
    deliveryFee,
    breakdown: {
      appliedRatePerKm: appliedRate,
      baseFee,
      surcharge: flatSurcharge,
      tierApplied,
    },
  };
};

const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's mean radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(0.5, Number((R * c).toFixed(2)));
};

// ==========================================
// 1. USER ENDPOINTS
// ==========================================



/**
 * GET /api/delivery/estimate-fee
 * Query Params:
 *  - merchantId (or shopId)
 *  - latitude  (optional, defaults to req.user.latitude)
 *  - longitude (optional, defaults to req.user.longitude)
 */
export const getUserDeliveryFeeEstimate = async (req, res) => {
  try {
    const { merchantId, shopId, latitude, longitude } = req.query;

    if (!merchantId && !shopId) {
      return res.status(400).json({
        success: false,
        message: "Either merchantId or shopId is required.",
      });
    }

    // 1. Resolve user coordinates (from query params or profile)
    let userLat = latitude !== undefined && latitude !== null ? Number(latitude) : req.user?.latitude;
    let userLng = longitude !== undefined && longitude !== null ? Number(longitude) : req.user?.longitude;

    if (userLat === undefined || userLng === undefined || isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({
        success: false,
        message: "User delivery location coordinates (latitude and longitude) are required.",
      });
    }

    // 2. Fetch Merchant profile and MerchantShop in parallel
    const shopQuery = merchantId ? { merchantId } : { _id: shopId };
    const shop = await MerchantShop.findOne(shopQuery)
      .select("merchantId shopName latitude longitude visibilityRadiusKm address city")
      .lean();

    if (!shop) {
      return res.status(404).json({ success: false, message: "Merchant shop not found." });
    }

    const resolvedMerchantId = shop.merchantId;
    const merchant = await Merchant.findById(resolvedMerchantId)
      .select("isDeliveryEnabled isBlocked status deliveryPricing")
      .lean();

    if (!merchant || merchant.isBlocked || merchant.status === "banned") {
      return res.status(404).json({
        success: false,
        message: "Merchant account is inactive or restricted.",
      });
    }

    if (!merchant.isDeliveryEnabled) {
      return res.status(400).json({
        success: false,
        isDeliverable: false,
        message: "This merchant does not currently provide delivery service.",
      });
    }

    if (!shop.latitude || !shop.longitude) {
      return res.status(400).json({
        success: false,
        message: "Shop geographic coordinates are not configured.",
      });
    }

    // 3. Compute Distance
    const distanceKm = calculateDistanceKm(shop.latitude, shop.longitude, userLat, userLng);

    // 4. Verify Merchant Service Radius Cap
    const maxRadius = Number(shop.visibilityRadiusKm) || 15;
    const isDeliverable = distanceKm <= maxRadius;

    if (!isDeliverable) {
      return res.status(200).json({
        success: true,
        isDeliverable: false,
        message: `Your location is outside the merchant delivery radius (${distanceKm} km away. Maximum service radius is ${maxRadius} km).`,
        data: {
          distanceKm,
          maxAllowedRadiusKm: maxRadius,
          deliveryFee: null,
        },
      });
    }

    // 5. Evaluate Merchant Dynamic Delivery Fee Tier
    const now = new Date();
    const pricing = merchant.deliveryPricing || {};
    const baseFee = pricing.baseFee ?? 20;
    const standardRate = pricing.ratePerKm ?? 10;
    const minimumFee = pricing.minimumDeliveryFee ?? 20;

    const night = pricing.nightConfig || {};
    const peak = pricing.peakConfig || {};

    let appliedRatePerKm = standardRate;
    let flatSurcharge = 0;
    let tierApplied = "STANDARD";
    let tierReason = "Standard daytime rate";

    if (night.isEnabled && isTimeInWindow(night.startTime, night.endTime, now)) {
      appliedRatePerKm = night.ratePerKm ?? standardRate;
      flatSurcharge = night.flatSurcharge ?? 0;
      tierApplied = "NIGHT";
      tierReason = `Night hours delivery rate applied (${night.startTime} - ${night.endTime})`;
    } else if (peak.isEnabled && isTimeInWindow(peak.startTime, peak.endTime, now)) {
      appliedRatePerKm = peak.ratePerKm ?? standardRate;
      flatSurcharge = peak.flatSurcharge ?? 0;
      tierApplied = "PEAK";
      tierReason = `Peak rush hours rate applied (${peak.startTime} - ${peak.endTime})`;
    }

    // 1 KM = X ₹ formula
    const rawDeliveryFee = (distanceKm * appliedRatePerKm) + baseFee + flatSurcharge;
    const finalDeliveryFee = Math.max(minimumFee, Math.round(rawDeliveryFee));
    const platformFee = Number(process.env.DEFAULT_PLATFORM_FEE) || 10;

    return res.status(200).json({
      success: true,
      isDeliverable: true,
      data: {
        shopId: shop._id,
        shopName: shop.shopName,
        distanceKm,
        deliveryFee: finalDeliveryFee,
        platformFee,
        totalDeliveryCharge: finalDeliveryFee + platformFee,
        tierApplied,
        tierReason,
        breakdown: {
          baseFee,
          ratePerKm: appliedRatePerKm,
          flatSurcharge,
          minimumDeliveryFee: minimumFee,
        },
      },
    });
  } catch (error) {
    console.error("User Delivery Fee Estimate Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to estimate delivery charge.",
      error: error.message,
    });
  }
};

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

    const [merchant, user, shop] = await Promise.all([
      Merchant.findById(merchantId),
      User.findById(userId),
      MerchantShop.findOne({ merchantId }).lean(),
    ]);

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

    if (!user) {
      return res.status(404).json({ success: false, message: "User record not found." });
    }

    // 1. Normalize and resolve inventory items
    const rawItemsList = Array.isArray(items) && items.length > 0
      ? items
      : [{ productId, productName: customItemName, quantity, unitPrice: itemPrice, variantInfo }];

    const productIds = rawItemsList.map((i) => i.productId).filter(Boolean);
    const dbProducts = await Product.find({
      _id: { $in: productIds },
      is_deleted: false,
    }).lean();

    const productMap = new Map(dbProducts.map((p) => [p._id.toString(), p]));

    const resolvedItems = rawItemsList.map((rawItem) => {
      const dbProduct = rawItem.productId ? productMap.get(rawItem.productId.toString()) : null;

      const resolvedName = dbProduct?.name || rawItem.productName || rawItem.customItemName || "Custom Item";
      const resolvedUnitPrice = dbProduct
        ? (dbProduct.discounted_price ?? dbProduct.price)
        : (Number(rawItem.unitPrice || rawItem.itemPrice) || 0);
      const thumbnail = dbProduct?.thumbnail || rawItem.productThumbnail || "";
      const itemQty = Math.max(1, Number(rawItem.quantity) || 1);

      return {
        productId: dbProduct?._id || null,
        productName: resolvedName,
        quantity: itemQty,
        unitPrice: resolvedUnitPrice,
        productThumbnail: thumbnail,
        variantInfo: rawItem.variantInfo || "",
        itemTotal: resolvedUnitPrice * itemQty,
      };
    });

    if (resolvedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one valid item is required to create a delivery order.",
      });
    }

    // 2. Geolocation & Distance Calculation
    const finalAddress = deliveryAddress || user.address;
    const finalPhone = contactPhone || user.phone || user.mobile;
    const userLat = finalAddress?.latitude ?? user.latitude;
    const userLng = finalAddress?.longitude ?? user.longitude;

    let distanceKm = 1;
    if (shop?.latitude && shop?.longitude && userLat && userLng) {
      distanceKm = calculateDistanceKm(shop.latitude, shop.longitude, userLat, userLng);

      // Check merchant configured service radius
      const maxAllowedRadius = shop.visibilityRadiusKm || 15;
      if (distanceKm > maxAllowedRadius) {
        return res.status(400).json({
          success: false,
          message: `Delivery address is outside the merchant's delivery zone (${distanceKm} km away. Maximum allowed: ${maxAllowedRadius} km).`,
        });
      }
    }

    // 3. Dynamic Delivery Fee Evaluation (Base + Per KM + Peak / Night)
    const { deliveryFee, breakdown } = calculateDeliveryFee(
      merchant.deliveryPricing,
      distanceKm,
      new Date()
    );

    const platformFee = Number(process.env.DEFAULT_PLATFORM_FEE) || 10;

    // 4. Create and persist single DeliveryOrder document
    const newOrder = new DeliveryOrder({
      userId,
      merchantId,
      items: resolvedItems,
      deliveryAddress: finalAddress,
      contactPhone: finalPhone,
      note: note ? note.trim() : "",
      distanceKm,
      deliveryFee,
      deliveryFeeBreakdown: breakdown,
      platformFee,
      estimatedDeliveryTime: {
        value: Number(estimatedMinutes) || 30,
        unit: "minutes",
      },
      status: "pending",
    });

    await newOrder.save();

    // Async push notification to merchant
    sendDeliveryNotification({
      recipientType: "Merchant",
      recipientId: merchantId,
      title: "📦 New Delivery Order Received!",
      body: `${user.name || "A customer"} placed an order with ${resolvedItems.length} item(s). Delivery: ₹${deliveryFee} (${breakdown.tierApplied}).`,
      type: "DELIVERY_ORDER_NEW",
      orderId: newOrder._id,
      extraData: {
        totalItems: String(resolvedItems.length),
        customerName: user.name || "Customer",
        tierApplied: breakdown.tierApplied,
      },
    }).catch((err) => console.error("Notification trigger error:", err.message));

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

    sendDeliveryNotification({
      recipientType: "Merchant",
      recipientId: order.merchantId,
      title: "❌ Delivery Order Canceled",
      body: `Customer canceled Order #${order.orderNumber || order._id.toString().slice(-6)}.`,
      type: "DELIVERY_ORDER_CANCELED",
      orderId: order._id,
      extraData: { cancelReason: order.cancelReason },
    }).catch((err) => console.error("Notification trigger error:", err.message));

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
      }).catch((err) => console.error("Notification trigger error:", err.message));
    } else {
      order.status = "declined";
      order.declineReason = declineReason || "Declined by merchant.";

      sendDeliveryNotification({
        recipientType: "User",
        recipientId: order.userId,
        title: "⚠️ Order Declined",
        body: `${shopDisplayName} could not accept your order: ${order.declineReason}`,
        type: "DELIVERY_ORDER_DECLINED",
        orderId: order._id,
        extraData: { declineReason: order.declineReason },
      }).catch((err) => console.error("Notification trigger error:", err.message));
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

    if (status === "dispatched") {
      sendDeliveryNotification({
        recipientType: "User",
        recipientId: order.userId,
        title: "🛵 Order Dispatched!",
        body: `Your order from ${shopDisplayName} is out for delivery!`,
        type: "DELIVERY_ORDER_DISPATCHED",
        orderId: order._id,
      }).catch((err) => console.error("Notification trigger error:", err.message));
    } else if (status === "delivered") {
      sendDeliveryNotification({
        recipientType: "User",
        recipientId: order.userId,
        title: "🎉 Order Delivered!",
        body: `Your order from ${shopDisplayName} has been delivered. Enjoy your purchase!`,
        type: "DELIVERY_ORDER_DELIVERED",
        orderId: order._id,
      }).catch((err) => console.error("Notification trigger error:", err.message));
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
      .populate("items.productId", "name thumbnail category_id price discounted_price")
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
      .populate("items.productId", "name thumbnail category_id price discounted_price")
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
      .populate("items.productId", "name thumbnail category_id price discounted_price")
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
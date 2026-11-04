import mongoose from "mongoose";
import ComboOffer from "../models/ComboOfferModel.js";
import MerchantShop from "../models/merchantShopModel.js";
import Product from "../models/productModel.js";

/**
 * POST /api/merchant/combo-offers/create
 * Creates a new combo offer with optional image uploads and mixed product mapping.
 */
export const createComboOffer = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const {
      name,
      description,
      tags,
      products, // Expecting a JSON string or parsed array of product items
      start_date,
      end_date,
      offer_quantity, // null or number
      terms_and_conditions,
      shopId,
    } = req.body;

    // 1. Core Validation
    if (!name || !description || !start_date || !end_date || !terms_and_conditions) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (name, description, start_date, end_date, terms_and_conditions).",
      });
    }

    // 2. Parse Products Array (handles both JSON string from multipart/form-data and direct array)
    let parsedProducts = [];
    try {
      parsedProducts = typeof products === "string" ? JSON.parse(products) : products;
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Invalid products payload format. Must be a valid JSON array.",
      });
    }

    if (!Array.isArray(parsedProducts) || parsedProducts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "A combo offer must include at least one product.",
      });
    }

    // 3. Date Validation
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    startDateObj.setUTCHours(0, 0, 0, 0);
    endDateObj.setUTCHours(23, 59, 59, 999);

    if (startDateObj > endDateObj) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot occur after the end date.",
      });
    }

    // 4. Resolve Shop ID (default to first active shop if not provided)
    let targetShopId = shopId;
    if (!targetShopId) {
      const defaultShop = await MerchantShop.findOne({ merchantId }).select("_id").lean();
      targetShopId = defaultShop ? defaultShop._id : null;
    } else {
      const validShop = await MerchantShop.findOne({ _id: targetShopId, merchantId }).lean();
      if (!validShop) {
        return res.status(404).json({ success: false, message: "Specified merchant shop not found." });
      }
    }

    // 5. Handle File Uploads (Multer fields or single files)
    const files = req.files || {};
    let comboBannerImage = null;
    if (files.banner && files.banner[0]) {
      comboBannerImage = `/uploads/${files.banner[0].filename}`;
    } else if (req.file) {
      comboBannerImage = `/uploads/${req.file.filename}`;
    }

    // 6. Process and Verify Products Items & Track Custom/New Products
    const formattedProducts = [];
    let hasCustomProduct = false; // Flag to determine if moderation review is required

    for (let i = 0; i < parsedProducts.length; i++) {
      const item = parsedProducts[i];

      if (!item.name || item.original_price === undefined || item.combo_price === undefined) {
        return res.status(400).json({
          success: false,
          message: `Product item at index ${i} is missing required fields (name, original_price, combo_price).`,
        });
      }

      let verifiedProductId = null;
      let itemImage = item.image || null;

      // If linking an existing catalog product
      if (item.productId && mongoose.Types.ObjectId.isValid(item.productId)) {
        const catalogProduct = await Product.findOne({
          _id: item.productId,
          merchant_id: merchantId,
          is_deleted: false,
        }).select("thumbnail name price").lean();

        if (catalogProduct) {
          verifiedProductId = catalogProduct._id;
          if (!itemImage) itemImage = catalogProduct.thumbnail;
        } else {
          hasCustomProduct = true; // Product ID provided but not found in catalog -> treat as custom
        }
      } else {
        // No valid productId provided -> indicates a new/ad-hoc product created specifically for this combo
        hasCustomProduct = true;
      }

      // Check if a specific image file was uploaded for this product index via multer (e.g., product_0)
      if (files[`product_${i}`] && files[`product_${i}`][0]) {
        itemImage = `/uploads/${files[`product_${i}`][0].filename}`;
      }

      formattedProducts.push({
        productId: verifiedProductId,
        name: item.name.trim(),
        image: itemImage,
        original_price: Number(item.original_price),
        combo_price: Number(item.combo_price),
        quantity: Number(item.quantity || 1),
        weight_size: item.weight_size ? item.weight_size.trim() : null,
        description: item.description ? item.description.trim() : null,
      });
    }

    // 7. Normalize Tags
    let normalizedTags = [];
    if (typeof tags === "string") {
      normalizedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
    } else if (Array.isArray(tags)) {
      normalizedTags = tags.map((t) => t.trim()).filter(Boolean);
    }

    // 8. Determine Approval Status (Pending if custom/ad-hoc products are included, approved otherwise)
    const approvalStatus = hasCustomProduct ? "pending" : "approved";

    // 9. Create and Save Combo Offer Document
    const newComboOffer = new ComboOffer({
      merchantId,
      shopId: targetShopId,
      name: name.trim(),
      description: description.trim(),
      tags: normalizedTags,
      products: formattedProducts,
      start_date: startDateObj,
      end_date: endDateObj,
      offer_quantity: offer_quantity !== undefined && offer_quantity !== "" ? Number(offer_quantity) : null,
      terms_and_conditions: terms_and_conditions.trim(),
      approval_status: approvalStatus,
      is_active: true,
    });

    await newComboOffer.save();

    return res.status(201).json({
      success: true,
      message: hasCustomProduct
        ? "Combo offer created successfully and submitted for admin review because it contains custom items."
        : "Combo offer created and approved successfully.",
      data: newComboOffer,
    });
  } catch (error) {
    console.error("Create Combo Offer Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create combo offer.",
      error: error.message,
    });
  }
};

/**
 * GET /api/merchant/combo-offers
 * Retrieves all combo offers created by the authenticated merchant.
 */
export const getMerchantComboOffers = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { page = 1, limit = 15, status } = req.query;

    const query = { merchantId, is_deleted: false };
    if (status === "active") query.is_active = true;
    if (status === "inactive") query.is_active = false;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [combos, total] = await Promise.all([
      ComboOffer.find(query)
        .populate("shopId", "shopName address city")
        .populate("products.productId", "name thumbnail price")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ComboOffer.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: combos,
    });
  } catch (error) {
    console.error("Get Merchant Combo Offers Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve combo offers.",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/merchant/combo-offers/:id/toggle-status
 * Toggles the active status of a merchant's combo offer.
 */
export const toggleComboOfferStatus = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { id } = req.params;

    const combo = await ComboOffer.findOne({ _id: id, merchantId, is_deleted: false });
    if (!combo) {
      return res.status(404).json({ success: false, message: "Combo offer not found." });
    }

    combo.is_active = !combo.is_active;
    await combo.save();

    return res.status(200).json({
      success: true,
      message: `Combo offer ${combo.is_active ? "activated" : "deactivated"} successfully.`,
      data: combo,
    });
  } catch (error) {
    console.error("Toggle Combo Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update combo offer status.",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/merchant/combo-offers/:id
 * Soft deletes a merchant's combo offer.
 */
export const deleteComboOffer = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { id } = req.params;

    const combo = await ComboOffer.findOneAndUpdate(
      { _id: id, merchantId, is_deleted: false },
      { $set: { is_deleted: true, is_active: false } },
      { new: true }
    );

    if (!combo) {
      return res.status(404).json({ success: false, message: "Combo offer not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Combo offer deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Combo Offer Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete combo offer.",
      error: error.message,
    });
  }
};
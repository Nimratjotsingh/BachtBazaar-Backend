import crypto from "crypto";
import Product from "../models/productModel.js";
import Offer from "../models/offerModel.js";
import ProductSuggestion from "../models/productSuggestionModel.js";
import Wishlist from "../models/wishlistModel.js";
import { notifyWishlistUsersOnPriceDrop } from "../utils/priceDropNotificationHelper.js";

// ==========================================
// HELPERS
// ==========================================

const generateAutoSKU = (productName = "PRD") => {
  const cleanPrefix = productName
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "X");

  const randomHash = crypto.randomBytes(2).toString("hex").toUpperCase();
  const timeSlice = Date.now().toString(36).slice(-4).toUpperCase();

  return `${cleanPrefix}-${randomHash}-${timeSlice}`;
};

const parseSpecifications = (rawSpecs) => {
  let specs = rawSpecs;
  if (typeof specs === "string") {
    try {
      specs = JSON.parse(specs);
    } catch {
      return [];
    }
  }

  if (Array.isArray(specs)) {
    return specs
      .filter((item) => item && typeof item === "object" && item.key && item.value)
      .map((item) => ({
        key: String(item.key).trim(),
        value: String(item.value).trim(),
      }));
  }

  return [];
};

// ==========================================
// MERCHANT ACTIONS
// ==========================================

// --- Create Product ---
export const createProduct = async (req, res) => {
  try {
    const data = { ...req.body };
    const merchantId = req.merchant._id;

    // 1. Verify if selecting from an Admin Product Suggestion
    let suggestionDoc = null;
    if (data.suggestion_id) {
      suggestionDoc = await ProductSuggestion.findOne({
        _id: data.suggestion_id,
        is_active: true,
      });

      if (!suggestionDoc) {
        return res.status(404).json({
          success: false,
          message: "Selected product suggestion template not found or inactive.",
        });
      }
    }

    // 2. Resolve Product Name (Merchant input or inherited from template)
    const resolvedName = (data.name || suggestionDoc?.name || "").trim();
    if (!resolvedName) {
      return res.status(400).json({
        success: false,
        message: "Product name is required.",
      });
    }

    // 3. Check for existing active product with the same name by this merchant
    const escapedName = resolvedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const duplicateProduct = await Product.findOne({
      merchant_id: merchantId,
      name: { $regex: new RegExp(`^${escapedName}$`, "i") },
      is_deleted: false,
    });

    if (duplicateProduct) {
      return res.status(409).json({
        success: false,
        message: `A product with the name "${resolvedName}" already exists in your inventory.`,
      });
    }

    // 4. Handle Media (Uploaded files vs template defaults)
    if (req.files?.thumbnail) {
      data.thumbnail = `/uploads/${req.files.thumbnail[0].filename}`;
    } else if (suggestionDoc?.thumbnail && !data.thumbnail) {
      data.thumbnail = suggestionDoc.thumbnail;
    }

    if (!data.thumbnail) {
      return res.status(400).json({
        success: false,
        message: "A main thumbnail image is required.",
      });
    }

    if (req.files?.images) {
      data.images = req.files.images.map((file) => `/uploads/${file.filename}`);
    } else if (suggestionDoc?.images?.length && (!data.images || data.images.length === 0)) {
      data.images = suggestionDoc.images;
    }

    // 5. Inherit template specifications if not provided by merchant
    if (!data.description && suggestionDoc?.description) {
      data.description = suggestionDoc.description;
    }
    if (!data.category_id && suggestionDoc?.category_id) {
      data.category_id = suggestionDoc.category_id;
    }
    if (!data.subcategory_id && suggestionDoc?.subcategory_id) {
      data.subcategory_id = suggestionDoc.subcategory_id;
    }
    if (!data.tags && suggestionDoc?.tags) {
      data.tags = suggestionDoc.tags;
    }
    if (!data.unit_size && suggestionDoc?.unit_size) {
      data.unit_size = suggestionDoc.unit_size;
    }

    // 6. Dynamic Key-Value Specifications Array
    if (data.specifications !== undefined) {
      data.specifications = parseSpecifications(data.specifications);
    } else if (suggestionDoc?.specifications?.length) {
      data.specifications = suggestionDoc.specifications;
    } else {
      data.specifications = [];
    }

    // 7. Automatic SKU Generation (if omitted or blank)
    if (!data.sku || !data.sku.trim()) {
      let generatedSKU = generateAutoSKU(resolvedName);
      let isUnique = false;
      let attempts = 0;

      while (!isUnique && attempts < 5) {
        const existingSKU = await Product.findOne({ sku: generatedSKU });
        if (!existingSKU) {
          isUnique = true;
        } else {
          generatedSKU = generateAutoSKU(resolvedName);
          attempts++;
        }
      }
      data.sku = generatedSKU;
    } else {
      data.sku = data.sku.trim().toUpperCase();
    }

    // 8. Normalize Array References & Structured Objects
    if (typeof data.category_id === "string") {
      try {
        data.category_id = JSON.parse(data.category_id);
      } catch {
        data.category_id = [data.category_id];
      }
    }

    if (typeof data.subcategory_id === "string") {
      try {
        data.subcategory_id = JSON.parse(data.subcategory_id);
      } catch {
        data.subcategory_id = [data.subcategory_id];
      }
    }

    if (typeof data.tags === "string") {
      try {
        data.tags = JSON.parse(data.tags);
      } catch {
        data.tags = data.tags.split(",").map((t) => t.trim()).filter(Boolean);
      }
    }

    if (data.manufacturing_date) {
      data.manufacturing_date = new Date(data.manufacturing_date);
    } else {
      delete data.manufacturing_date;
    }

    if (data.expiry_date) {
      data.expiry_date = new Date(data.expiry_date);
    } else {
      delete data.expiry_date;
    }

    // 9. Auto-Approval vs Admin Moderation Queue
    const isAutoApproved = Boolean(suggestionDoc);

    data.name = resolvedName;
    data.merchant_id = merchantId;
    data.suggestion_id = suggestionDoc ? suggestionDoc._id : null;
    data.approval_status = isAutoApproved ? "approved" : "pending";
    data.approval_date = isAutoApproved ? new Date() : null;
    data.approved_by = isAutoApproved ? suggestionDoc.created_by : null;
    data.rejection_reason = "";

    const newProduct = new Product(data);
    await newProduct.save();

    if (suggestionDoc) {
      await ProductSuggestion.findByIdAndUpdate(suggestionDoc._id, {
        $inc: { usage_count: 1 },
      });
    }

    return res.status(201).json({
      success: true,
      message: isAutoApproved
        ? "Product created and automatically approved via catalog suggestion."
        : "Custom product submitted for administrative review successfully.",
      autoApproved: isAutoApproved,
      product: newProduct,
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.sku) {
      return res.status(400).json({
        success: false,
        message: "A product with this SKU already exists.",
      });
    }
    return res.status(400).json({ success: false, message: error.message });
  }
};

// --- List All Products (Admin or Global Catalog View) ---
export const listProductsAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      category,
      minPrice,
      maxPrice,
      featured,
      approvalStatus,
    } = req.query || {};

    const query = { is_deleted: false };

    if (search && search.trim() !== "") {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { tags: { $in: [new RegExp(search.trim(), "i")] } },
      ];
    }

    if (category) query.category_id = category;
    if (approvalStatus) query.approval_status = approvalStatus;

    if (featured !== undefined) {
      query.is_featured = featured === "true";
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const currentLimit = Number(limit);
    const skip = (Math.max(1, Number(page)) - 1) * currentLimit;

    const [total, products] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query)
        .populate("merchant_id", "name email phone")
        .populate("category_id", "label")
        .populate("subcategory_id", "label")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(currentLimit)
        .lean(),
    ]);

    return res.json({
      success: true,
      products,
      total,
      pages: Math.ceil(total / currentLimit) || 1,
      currentPage: Number(page),
    });
  } catch (error) {
    console.error("List Products All Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve products",
      error: error.message,
    });
  }
};

// --- List Products (Merchant Authenticated Context) ---
export const listProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      category,
      minPrice,
      maxPrice,
      featured,
      approvalStatus,
    } = req.query || {};

    const query = {
      merchant_id: req.merchant._id,
      is_deleted: false,
    };

    if (search && search.trim() !== "") {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { tags: { $in: [new RegExp(search.trim(), "i")] } },
      ];
    }

    if (category) query.category_id = category;
    if (approvalStatus) query.approval_status = approvalStatus;

    if (featured !== undefined) {
      query.is_featured = featured === "true";
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const currentLimit = Number(limit);
    const skip = (Math.max(1, Number(page)) - 1) * currentLimit;

    const [total, products] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query)
        .populate("category_id", "label")
        .populate("subcategory_id", "label")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(currentLimit)
        .lean(),
    ]);

    return res.json({
      success: true,
      products,
      total,
      pages: Math.ceil(total / currentLimit) || 1,
      currentPage: Number(page),
    });
  } catch (error) {
    console.error("List Products Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve products",
      error: error.message,
    });
  }
};

// --- Get Single Product Details ---
export const getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, is_deleted: false })
      .populate("merchant_id", "name email phone")
      .populate("category_id", "label")
      .populate("subcategory_id", "label")
      .populate("approved_by", "name email")
      .lean();

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    return res.json({ success: true, product });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching product details", error: error.message });
  }
};

// --- Update Product (Triggers Price Drop Alerts & Specification Sync) ---
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { price, discounted_price, specifications, tags, category_id, subcategory_id, ...otherUpdates } = req.body;

    const existingProduct = await Product.findOne({
      _id: id,
      merchant_id: req.merchant._id,
      is_deleted: false,
    });

    if (!existingProduct) {
      return res.status(404).json({ success: false, message: "Product not found or unauthorized." });
    }

    const oldEffectivePrice = Number(existingProduct.discounted_price || existingProduct.price);

    if (price !== undefined) existingProduct.price = Number(price);
    if (discounted_price !== undefined) {
      existingProduct.discounted_price = discounted_price === null || discounted_price === "" ? null : Number(discounted_price);
    }

    if (specifications !== undefined) {
      existingProduct.specifications = parseSpecifications(specifications);
    }

    if (tags !== undefined) {
      if (typeof tags === "string") {
        try {
          existingProduct.tags = JSON.parse(tags);
        } catch {
          existingProduct.tags = tags.split(",").map((t) => t.trim()).filter(Boolean);
        }
      } else if (Array.isArray(tags)) {
        existingProduct.tags = tags;
      }
    }

    if (category_id !== undefined) {
      if (typeof category_id === "string") {
        try {
          existingProduct.category_id = JSON.parse(category_id);
        } catch {
          existingProduct.category_id = [category_id];
        }
      } else if (Array.isArray(category_id)) {
        existingProduct.category_id = category_id;
      }
    }

    if (subcategory_id !== undefined) {
      if (typeof subcategory_id === "string") {
        try {
          existingProduct.subcategory_id = JSON.parse(subcategory_id);
        } catch {
          existingProduct.subcategory_id = [subcategory_id];
        }
      } else if (Array.isArray(subcategory_id)) {
        existingProduct.subcategory_id = subcategory_id;
      }
    }

    // Media updates if files were submitted in multipart
    if (req.files?.thumbnail) {
      existingProduct.thumbnail = `/uploads/${req.files.thumbnail[0].filename}`;
    }
    if (req.files?.images) {
      existingProduct.images = req.files.images.map((file) => `/uploads/${file.filename}`);
    }

    Object.assign(existingProduct, otherUpdates);
    await existingProduct.save();

    const newEffectivePrice = Number(existingProduct.discounted_price || existingProduct.price);
    const isPriceReduced = newEffectivePrice < oldEffectivePrice;

    // Trigger price drop push/notification
    if (isPriceReduced) {
      notifyWishlistUsersOnPriceDrop({
        itemId: existingProduct._id,
        itemType: "products",
        itemTitle: existingProduct.name,
        oldPrice: oldEffectivePrice,
        newPrice: newEffectivePrice,
        thumbnail: existingProduct.thumbnail || "",
        merchantId: existingProduct.merchant_id,
      }).catch((err) => console.error("Price Drop Notification Error:", err.message));
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      data: existingProduct,
      priceDropDetected: isPriceReduced,
    });
  } catch (error) {
    console.error("Update Product Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// --- Delete Product (With Running/Paused Offer Safety Verification) ---
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const merchantId = req.merchant._id;
    const now = new Date();

    const product = await Product.findOne({
      _id: id,
      merchant_id: merchantId,
      is_deleted: false,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or unauthorized",
      });
    }

    // Validate that no active, unpaused offer is running on this product
    const runningOffer = await Offer.findOne({
      merchant_id: merchantId,
      product_id: id,
      is_deleted: false,
      is_active: true,
      is_draft: false,
      is_paused: false,
      start_date: { $lte: now },
      $or: [
        { end_date: { $exists: false } },
        { end_date: null },
        { end_date: { $gte: now } },
      ],
    }).select("title");

    if (runningOffer) {
      return res.status(400).json({
        success: false,
        message: `An offer ("${runningOffer.title}") is currently running on this product. You cannot delete it yet. Please end or pause the offer first.`,
      });
    }

    product.is_deleted = true;
    product.is_active = false;
    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product moved to trash successfully",
    });
  } catch (error) {
    console.error("Delete Product Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: error.message,
    });
  }
};

// --- Featured Toggle ---
export const toggleFeatured = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      merchant_id: req.merchant._id,
      is_deleted: false,
    });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    product.is_featured = !product.is_featured;
    await product.save();

    return res.json({ success: true, featured: product.is_featured });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to toggle featured status", error: error.message });
  }
};

// ==========================================
// ADMIN WORKFLOW ENDPOINTS
// ==========================================

// --- List Review Queue Items ---
export const getPendingProductsAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = "pending" } = req.query;

    const filter = {
      is_deleted: false,
      approval_status: status,
    };

    const currentLimit = Number(limit);
    const skip = (Math.max(1, Number(page)) - 1) * currentLimit;

    const [total, queueItems] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .populate("merchant_id", "name email phone")
        .populate("category_id", "label")
        .populate("subcategory_id", "label")
        .sort({ updatedAt: 1 }) // Review oldest submissions first
        .skip(skip)
        .limit(currentLimit)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      count: queueItems.length,
      total,
      pages: Math.ceil(total / currentLimit) || 1,
      currentPage: Number(page),
      data: queueItems,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// --- Approve, Reject, or Reset a Product Listing ---
export const reviewProductAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;

    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action status parameter choice. Must be 'approved', 'rejected', or 'pending'.",
      });
    }

    if (status === "rejected" && (!rejection_reason || rejection_reason.trim() === "")) {
      return res.status(400).json({
        success: false,
        message: "You must provide a clear rejection explanation reason.",
      });
    }

    const reviewPayload = {
      approval_status: status,
      approved_by: status === "approved" ? (req.superAdmin?._id || req.admin?._id) : null,
      approval_date: status === "approved" ? new Date() : null,
      rejection_reason: status === "rejected" ? rejection_reason.trim() : "",
      ...(status === "rejected" && { is_active: false }),
    };

    const verifiedProduct = await Product.findOneAndUpdate(
      { _id: id, is_deleted: false },
      { $set: reviewPayload },
      { new: true, runValidators: true }
    );

    if (!verifiedProduct) {
      return res.status(404).json({ success: false, message: "Target product listing not found." });
    }

    return res.status(200).json({
      success: true,
      message: `Product has been successfully marked as ${status}.`,
      product: verifiedProduct,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
import ProductSuggestion from "../models/productSuggestionModel.js";
import fs from "fs";
import path from "path";

// Helper to remove orphaned files from public directory
const removeLocalFile = (relativePath) => {
  if (!relativePath || !relativePath.startsWith("/uploads/")) return;
  const fullPath = path.join(process.cwd(), "public", relativePath);
  if (fs.existsSync(fullPath)) {
    fs.unlink(fullPath, (err) => {
      if (err) console.error(`Failed to delete file ${fullPath}:`, err.message);
    });
  }
};

/**
 * 1. CREATE Product Suggestion
 * POST /api/admin/product-suggestions
 */
export const createProductSuggestion = async (req, res) => {
  try {
    const data = { ...req.body };

    if (!data.name || !data.name.trim()) {
      return res.status(400).json({ success: false, message: "Suggestion name is required." });
    }
    if (!data.description || !data.description.trim()) {
      return res.status(400).json({ success: false, message: "Description is required." });
    }

    // Handle uploaded assets
    if (req.files?.thumbnail) {
      data.thumbnail = `/uploads/${req.files.thumbnail[0].filename}`;
    }
    if (!data.thumbnail) {
      return res.status(400).json({ success: false, message: "Thumbnail image is required." });
    }

    if (req.files?.images) {
      data.images = req.files.images.map((f) => `/uploads/${f.filename}`);
    }

    // Normalize array / object fields from multipart/form-data
    if (typeof data.category_id === "string") {
      try { data.category_id = JSON.parse(data.category_id); } catch { data.category_id = [data.category_id]; }
    }
    if (typeof data.subcategory_id === "string") {
      try { data.subcategory_id = JSON.parse(data.subcategory_id); } catch { data.subcategory_id = [data.subcategory_id]; }
    }
    if (typeof data.tags === "string") {
      try { data.tags = JSON.parse(data.tags); } catch { data.tags = data.tags.split(",").map((t) => t.trim()).filter(Boolean); }
    }
    if (typeof data.weight === "string") {
      try { data.weight = JSON.parse(data.weight); } catch { data.weight = null; }
    }
    if (typeof data.volume === "string") {
      try { data.volume = JSON.parse(data.volume); } catch { data.volume = null; }
    }

    const suggestion = await ProductSuggestion.create({
      ...data,
      name: data.name.trim(),
      created_by: req.admin?._id || null,
    });

    return res.status(201).json({
      success: true,
      message: "Product suggestion template created successfully.",
      data: suggestion,
    });
  } catch (error) {
    console.error("Create Product Suggestion Error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * 2. READ All Product Suggestions (with pagination, search, status, and category filtering)
 * GET /api/admin/product-suggestions
 */
export const getAllProductSuggestions = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, status } = req.query;

    const query = {};

    if (status === "active") query.is_active = true;
    if (status === "inactive") query.is_active = false;

    if (category) {
      query.category_id = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { tags: { $in: [new RegExp(search.trim(), "i")] } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [suggestions, total] = await Promise.all([
      ProductSuggestion.find(query)
        .populate("category_id", "label name")
        .populate("subcategory_id", "label name")
        .populate("created_by", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ProductSuggestion.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      data: suggestions,
    });
  } catch (error) {
    console.error("Get All Product Suggestions Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. READ Single Product Suggestion by ID
 * GET /api/admin/product-suggestions/:id
 */
export const getProductSuggestionById = async (req, res) => {
  try {
    const { id } = req.params;

    const suggestion = await ProductSuggestion.findById(id)
      .populate("category_id", "label name")
      .populate("subcategory_id", "label name")
      .populate("created_by", "name email")
      .lean();

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        message: "Product suggestion template not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: suggestion,
    });
  } catch (error) {
    console.error("Get Product Suggestion By ID Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. UPDATE Product Suggestion
 * PUT /api/admin/product-suggestions/:id
 */
export const updateProductSuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const suggestion = await ProductSuggestion.findById(id);
    if (!suggestion) {
      return res.status(404).json({
        success: false,
        message: "Product suggestion template not found.",
      });
    }

    // Process new thumbnail upload & delete older file
    if (req.files?.thumbnail) {
      removeLocalFile(suggestion.thumbnail);
      updateData.thumbnail = `/uploads/${req.files.thumbnail[0].filename}`;
    }

    // Process new images upload & merge/replace
    if (req.files?.images) {
      const newImages = req.files.images.map((f) => `/uploads/${f.filename}`);
      if (updateData.keepExistingImages === "true" || updateData.keepExistingImages === true) {
        updateData.images = [...(suggestion.images || []), ...newImages];
      } else {
        (suggestion.images || []).forEach(removeLocalFile);
        updateData.images = newImages;
      }
    }

    // Parse JSON string formats
    if (typeof updateData.category_id === "string") {
      try { updateData.category_id = JSON.parse(updateData.category_id); } catch { updateData.category_id = [updateData.category_id]; }
    }
    if (typeof updateData.subcategory_id === "string") {
      try { updateData.subcategory_id = JSON.parse(updateData.subcategory_id); } catch { updateData.subcategory_id = [updateData.subcategory_id]; }
    }
    if (typeof updateData.tags === "string") {
      try { updateData.tags = JSON.parse(updateData.tags); } catch { updateData.tags = updateData.tags.split(",").map((t) => t.trim()).filter(Boolean); }
    }
    if (typeof updateData.weight === "string") {
      try { updateData.weight = JSON.parse(updateData.weight); } catch { updateData.weight = null; }
    }
    if (typeof updateData.volume === "string") {
      try { updateData.volume = JSON.parse(updateData.volume); } catch { updateData.volume = null; }
    }

    const updated = await ProductSuggestion.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("category_id", "label name")
      .populate("subcategory_id", "label name");

    return res.status(200).json({
      success: true,
      message: "Product suggestion updated successfully.",
      data: updated,
    });
  } catch (error) {
    console.error("Update Product Suggestion Error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * 5. TOGGLE ACTIVE/INACTIVE STATUS
 * PATCH /api/admin/product-suggestions/:id/toggle-status
 */
export const toggleProductSuggestionStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const suggestion = await ProductSuggestion.findById(id);
    if (!suggestion) {
      return res.status(404).json({
        success: false,
        message: "Product suggestion template not found.",
      });
    }

    suggestion.is_active = !suggestion.is_active;
    await suggestion.save();

    return res.status(200).json({
      success: true,
      message: `Product suggestion is now ${suggestion.is_active ? "active" : "inactive"}.`,
      data: {
        _id: suggestion._id,
        is_active: suggestion.is_active,
      },
    });
  } catch (error) {
    console.error("Toggle Suggestion Status Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. DELETE Product Suggestion (Hard Delete with File Cleanup)
 * DELETE /api/admin/product-suggestions/:id
 */
export const deleteProductSuggestion = async (req, res) => {
  try {
    const { id } = req.params;

    const suggestion = await ProductSuggestion.findById(id);
    if (!suggestion) {
      return res.status(404).json({
        success: false,
        message: "Product suggestion template not found.",
      });
    }

    // Clean up local image files
    removeLocalFile(suggestion.thumbnail);
    (suggestion.images || []).forEach(removeLocalFile);

    await ProductSuggestion.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Product suggestion template and linked assets deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Product Suggestion Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
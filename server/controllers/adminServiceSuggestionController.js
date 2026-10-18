import ServiceReference from "../models/serviceSuggestionModel.js";
import mongoose from "mongoose";
// 1. Create a Master Service Suggestion
// Helper to normalize any incoming ID format (JSON string, single string, CSV, or Array) into clean valid ObjectIds
const normalizeObjectIdArray = (input) => {
  if (!input) return [];

  let parsed = input;

  // 1. If it's a string, attempt to parse JSON first (handles '["id1", "id2"]')
  if (typeof parsed === "string") {
    const trimmed = parsed.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        // Fall back to regex/split if JSON.parse fails
        parsed = trimmed.replace(/[\[\]"']/g, "").split(",");
      }
    } else if (trimmed.includes(",")) {
      parsed = trimmed.split(",");
    } else {
      parsed = [trimmed];
    }
  }

  // 2. Ensure it's an array
  if (!Array.isArray(parsed)) {
    parsed = [parsed];
  }

  // 3. Flatten, clean string artifacts, and filter valid ObjectIds
  return parsed
    .flat(Infinity)
    .map((item) => {
      if (typeof item === "string") {
        return item.replace(/[\[\]"'\s]/g, ""); // Strip leftover brackets or quotes
      }
      return item?._id ? String(item._id) : String(item);
    })
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
};

export const createSuggestion = async (req, res) => {
  try {
    const { name, description, category_id, subcategory_id, is_active } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: "Suggestion name and description are required.",
      });
    }

    // Safely parse and extract valid ObjectIds
    const categories = normalizeObjectIdArray(category_id);
    const subcategories = normalizeObjectIdArray(subcategory_id);

    if (categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one valid category is required.",
      });
    }

    let image = null;
    if (req.file) {
      image = `/uploads/${req.file.filename}`;
    }

    const suggestion = await ServiceReference.create({
      name: name.trim(),
      description: description.trim(),
      image,
      category_id: categories,
      subcategory_id: subcategories,
      suggested_by: null, // Admin direct creation
      status: "approved",
      is_active: is_active !== undefined ? is_active === "true" || is_active === true : true,
    });

    return res.status(201).json({
      success: true,
      message: "Master service suggestion created successfully.",
      suggestion,
    });
  } catch (error) {
    console.error("Create suggestion error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create suggestion.",
      error: error.message,
    });
  }
};

// 2. List All Suggestions (with Search, Filter, Pagination)
export const listSuggestions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      category_id,
      is_active,
    } = req.query;

    const query = {};

    if (search) {
      query.name = { $regex: String(search).trim(), $options: "i" };
    }

    if (status) query.status = status; // "approved", "pending", "rejected"
    if (category_id) query.category_id = category_id;
    if (is_active !== undefined) query.is_active = is_active === "true";

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    // Run parallel queries for paginated results and global stat metrics
    const [suggestions, total, approvedCount, pendingCount, inactiveCount] = await Promise.all([
      ServiceReference.find(query)
        .populate("category_id", "label")
        .populate("subcategory_id", "label")
        .populate("suggested_by", "name businessName email phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ServiceReference.countDocuments(query),
      // Aggregate stats across the entire collection (ignoring pagination)
      ServiceReference.countDocuments({ status: "approved", is_active: true }),
      ServiceReference.countDocuments({ status: "pending" }),
      ServiceReference.countDocuments({ $or: [{ is_active: false }, { status: "rejected" }] }),
    ]);

    return res.status(200).json({
      success: true,
      suggestions,
      total,
      pages: Math.ceil(total / limit) || 1,
      currentPage: Number(page),
      // --- Added computed stats matching your dashboard ticker cards ---
      stats: {
        totalTemplates: total,
        approved: approvedCount,
        pending: pendingCount,
        inactive: inactiveCount,
      },
    });
  } catch (error) {
    console.error("List Service Suggestions Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch suggestions.",
      error: error.message,
    });
  }
};

// 3. Get Single Suggestion Details
export const getSuggestionDetails = async (req, res) => {
  try {
    const suggestion = await ServiceReference.findById(req.params.id)
      .populate("category_id", "label")
      .populate("subcategory_id", "label")
      .populate("suggested_by", "name businessName email phone");

    if (!suggestion) {
      return res.status(404).json({ success: false, message: "Suggestion not found." });
    }

    return res.status(200).json({ success: true, suggestion });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching suggestion.",
      error: error.message,
    });
  }
};

// 4. Update a Suggestion
export const updateSuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (req.file) {
      updates.image = `/uploads/${req.file.filename}`;
    }

    // Robust helper to parse IDs whether sent as JSON strings, comma-separated strings, or arrays
    const parseIds = (val) => {
      if (!val) return undefined;
      try {
        if (typeof val === "string" && val.trim().startsWith("[")) {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) 
            ? parsed.map(item => item.toString().trim()).filter(Boolean) 
            : [parsed.toString().trim()];
        }
        if (typeof val === "string" && val.includes(",")) {
          return val.split(",").map((s) => s.trim()).filter(Boolean);
        }
        if (typeof val === "string") {
          return [val.trim()];
        }
        if (Array.isArray(val)) {
          return val.map(item => item.toString().trim()).filter(Boolean);
        }
      } catch (e) {
        if (typeof val === "string") return [val.trim()];
      }
      return val;
    };

    if (updates.category_id) {
      updates.category_id = parseIds(updates.category_id);
    }

    if (updates.subcategory_id) {
      updates.subcategory_id = parseIds(updates.subcategory_id);
    }

    if (updates.is_active !== undefined) {
      updates.is_active = updates.is_active === "true" || updates.is_active === true;
    }

    const suggestion = await ServiceReference.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!suggestion) {
      return res.status(404).json({ success: false, message: "Suggestion not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Suggestion updated successfully.",
      suggestion,
    });
  } catch (error) {
    console.error("Update Suggestion Error:", error);
    return res.status(400).json({
      success: false,
      message: "Failed to update suggestion.",
      error: error.message,
    });
  }
};

// 5. Delete a Suggestion
export const deleteSuggestion = async (req, res) => {
  try {
    const suggestion = await ServiceReference.findByIdAndDelete(req.params.id);

    if (!suggestion) {
      return res.status(404).json({ success: false, message: "Suggestion not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Master suggestion deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete suggestion.",
      error: error.message,
    });
  }
};
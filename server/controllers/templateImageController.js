import TemplateImage from "../models/templateImageModel.js";

// --- Create Background Template ---
export const createTemplateImage = async (req, res) => {
  try {
    const data = { ...req.body };

    // 1. Process File Upload path from Multer
    if (req.file) {
      data.url = `/uploads/${req.file.filename}`;
    } else if (req.files && req.files.image) {
      // Fallback if using upload.fields instead of upload.single
      data.url = `/uploads/${req.files.image[0].filename}`;
    }

    if (!data.url) {
      return res.status(400).json({ success: false, message: "Please upload a template image file." });
    }

    // 2. Format Mongoose relationship fields (Convert empty strings to null)
    if (!data.category_id || data.category_id === "none") data.category_id = null;
    if (!data.subcategory_id || data.subcategory_id === "none") data.subcategory_id = null;

    // 3. Process tags array if sent as a comma-separated string from form-data
    if (typeof data.tags === "string") {
      data.tags = data.tags.split(",").map(tag => tag.trim().toLowerCase()).filter(Boolean);
    }

    const newTemplate = new TemplateImage({
      name: data.name?.trim() || "Untitled Template",
      url: data.url,
      category_id: data.category_id,
      subcategory_id: data.subcategory_id,
      theme_style: data.theme_style?.trim().toLowerCase() || "general",
      aspect_ratio: data.aspect_ratio?.trim() || "1:1",
      tags: data.tags || [],
    });

    await newTemplate.save();
    res.status(201).json({ success: true, message: "Template image uploaded successfully", data: newTemplate });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- Read/List Templates (Admin Panel View) ---
export const getTemplateImagesAdmin = async (req, res) => {
  try {
    const { search, category, theme, ratio } = req.query;
    let query = { isDeleted: false };

    // Built-in filters for lookups
    if (category && category !== "all") query.category_id = category;
    if (theme) query.theme_style = theme.toLowerCase();
    if (ratio) query.aspect_ratio = ratio;
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { tags: { $in: [search.toLowerCase()] } }
      ];
    }

    const templates = await TemplateImage.find(query)
      .populate("category_id", "label")
      .populate("subcategory_id", "label")
      .populate("offertype_id", "label value")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: templates.length, data: templates });
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Update Template Configurations ---
export const updateTemplateImage = async (req, res) => {
  try {
    const { id } = req.params;
    let updates = { ...req.body };

    console.log(updates)

    // 1. Process replacement layout image if uploaded
    if (req.file) {
      updates.url = `/uploads/${req.file.filename}`;
    } else if (req.files && req.files.image) {
      updates.url = `/uploads/${req.files.image[0].filename}`;
    }

    // 2. Maintain standard null structures for unassigned fields
    if (updates.category_id === "none" || updates.category_id === "") updates.category_id = null;
    if (updates.subcategory_id === "none" || updates.subcategory_id === "") updates.subcategory_id = null;
    if (updates.offertype_id === "none" || updates.offertype_id === "") updates.offertype_id = null;

    // 3. Process stringified tags
    if (typeof updates.tags === "string") {
      updates.tags = updates.tags.split(",").map(tag => tag.trim().toLowerCase()).filter(Boolean);
    }

    const updatedTemplate = await TemplateImage.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedTemplate) {
      return res.status(404).json({ success: false, message: "Template asset not found." });
    }

    res.status(200).json({ success: true, message: "Template configuration modified", data: updatedTemplate });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- Soft Delete Template ---
export const deleteTemplateImage = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await TemplateImage.findByIdAndUpdate(
      id,
      { $set: { isDeleted: true, isActive: false } },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ success: false, message: "Template asset not found." });
    }

    res.status(200).json({ success: true, message: "Template removed successfully from merchant catalog." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Increment Asset Usage (Called by Merchant tool when selected) ---
export const incrementTemplateUsage = async (req, res) => {
  try {
    const { id } = req.params;
    await TemplateImage.findByIdAndUpdate(id, { $inc: { use_count: 1 } });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Read/List Templates (Merchant Custom Catalog View) ---
export const getTemplateImagesMerchant = async (req, res) => {
  try {
    const { category_id, subcategory_id, offertype_id, theme, ratio,product_id } = req.query;

    // Base query targeting active, non-deleted template assets
    let query = { 
      isDeleted: false,
      isActive: true 
    };

    // 1. Core Structural Filtering Logic
    // If specific contextual matching IDs are sent, filter down to them or look for system general designs (null)
    if (category_id) {
      query.category_id = { $in: [category_id, null] };
    }
    
    if (subcategory_id) {
      query.subcategory_id = { $in: [subcategory_id, null] };
    }

    if (offertype_id) {
      query.offertype_id = { $in: [offertype_id, null] };
    }

    // 2. Secondary Design Profile Layout parameters
    if (theme) {
      query.theme_style = theme.toLowerCase().trim();
    }
    
    if (ratio) {
      query.aspect_ratio = ratio.trim();
    }

    // 3. Fetch matching template configurations
    const templates = await TemplateImage.find(query)
      .populate("category_id", "label value")
      .populate("subcategory_id", "label value")
      .populate("offertype_id", "label value")
      .sort({ use_count: -1, createdAt: -1 }); // Prioritize high-performing/popular graphics

    res.status(200).json({
      success: true,
      count: templates.length,
      data: templates
    });

  } catch (error) {
    console.error("Merchant Template Query Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to assemble tailored template catalog views." 
    });
  }
};
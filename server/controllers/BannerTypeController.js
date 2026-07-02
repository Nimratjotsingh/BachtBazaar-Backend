import BannerType from "../models/BannerTypeModel.js";

// ==========================================
// 1. CREATE - Add a new Banner Type
// ==========================================
export const createBannerType = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Banner type name is required." });
    }

    // Capture the saved image path from Multer stream hooks
    let imgPath = "";
    if (req.file) {
      imgPath = `/uploads/${req.file.filename}`;
    }

    const normalizedIsActive = isActive === "true" || isActive === true;

    // ✓ FORCE COMPUTE SAFE SLUG MANUALLY HERE TO BYPASS STREAM TIMING ISSUES
    const generatedSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const newType = new BannerType({ 
      name: name.trim(), 
      slug: generatedSlug, // Injected cleanly
      img: imgPath, 
      description: description ? description.trim() : "", 
      isActive: normalizedIsActive 
    });
    
    await newType.save();

    return res.status(201).json({
      success: true,
      message: "Banner type created successfully.",
      data: newType
    });
  } catch (error) {
    // Intercept both name or slug uniqueness constraint errors
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: "A banner type configuration layout with this name or slug key registry already exists." 
      });
    }
    console.error("Create Banner Type Controller Exception Trace:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
// ==========================================
// 2. READ ALL - List all Banner Types (Admin/User)
// ==========================================
export const getAllBannerTypes = async (req, res) => {
  try {
    const bannerTypes = await BannerType.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: bannerTypes.length,
      data: bannerTypes
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 3. READ ONE - Get single configuration details
// ==========================================
export const getBannerTypeById = async (req, res) => {
  try {
    const { id } = req.params;

    const bannerType = await BannerType.findById(id).lean();
    if (!bannerType) {
      return res.status(404).json({ success: false, message: "Banner type not found." });
    }

    return res.status(200).json({ success: true, data: bannerType });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 4. UPDATE - Modify layout attributes
// ==========================================
export const updateBannerType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const bannerType = await BannerType.findById(id);
    if (!bannerType) {
      return res.status(404).json({ success: false, message: "Banner type not found." });
    }

    // Update string fields if provided
    if (name !== undefined) bannerType.name = name;
    if (description !== undefined) bannerType.description = description;
    
    // Handle form-data string-to-boolean coercion
    if (isActive !== undefined) {
      bannerType.isActive = isActive === "true" || isActive === true;
    }

    // Process file updates only if a new file payload stream is actually uploaded
    if (req.file) {
      bannerType.img = `/uploads/${req.file.filename}`;
    }
    
    // Explicitly clear pre-existing slug matching if name changed to trigger automatic re-slugging hook
    if (name) {
      bannerType.slug = undefined;
    }

    await bannerType.save();

    return res.status(200).json({
      success: true,
      message: "Banner type updated successfully.",
      data: bannerType
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "A banner type with this name or slug already exists." });
    }
    console.error("Update Banner Type Controller Exception Trace:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 5. DELETE - Remove from database configuration
// ==========================================
export const deleteBannerType = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedType = await BannerType.findByIdAndDelete(id);
    if (!deletedType) {
      return res.status(404).json({ success: false, message: "Banner type not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Banner type deleted successfully."
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
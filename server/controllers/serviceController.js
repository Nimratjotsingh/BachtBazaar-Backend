import Service from "../models/serviceModel.js";

// --- Create Service Listing ---
export const createService = async (req, res) => {
  try {
    const {
      name,
      description,
      category_id,
      subcategory_id,
      service_id,
      price,
      discounted_price,
      pricing_type,
      images,
      thumbnail,
      tags,
      is_active,
      is_featured,
    } = req.body;

    // 1. Manual Required Fields Validation
    if (!name || !description || !price || !thumbnail || !pricing_type) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide name, description, price, thumbnail, and pricing type.",
      });
    }

    // 2. Category Array Validation
    if (!Array.isArray(category_id) || category_id.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one category is required.",
      });
    }

    // 3. Pricing Logic Validation
    const basePrice = Number(price);
    const discPrice = discounted_price ? Number(discounted_price) : null;

    if (discPrice !== null && discPrice >= basePrice) {
      return res.status(400).json({
        success: false,
        message: "Discounted price must be lower than the base price.",
      });
    }

    // 4. Initialization
    const newService = new Service({
      merchant_id: req.merchant._id, // Assumes auth middleware populates req.merchant
      name: name.trim(),
      description: description.trim(),
      category_id,
      subcategory_id: Array.isArray(subcategory_id) ? subcategory_id : [],
      service_id: service_id || null,
      price: basePrice,
      discounted_price: discPrice,
      pricing_type, // "fixed", "hourly", "starting_from", etc.
      images: Array.isArray(images) ? images : [],
      thumbnail,
      tags: Array.isArray(tags) ? tags : [],
      is_active: is_active !== undefined ? is_active : true,
      is_featured: is_featured !== undefined ? is_featured : false,
    });

    await newService.save();

    res.status(201).json({
      success: true,
      message: "Service listed successfully",
      service: newService,
    });
  } catch (error) {
    console.error("Create Service Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- List Services (Filters & Pagination) ---
export const listServices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      minPrice,
      maxPrice,
      featured,
      pricingType,
    } = req.query;

    const query = { is_deleted: false };

    // Text search using the model's text index
    if (search) {
      query.$text = { $search: search };
    }

    if (category) query.category_id = category;
    if (pricingType) query.pricing_type = pricingType;
    if (featured) query.is_featured = featured === "true";

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const total = await Service.countDocuments(query);
    const services = await await Service.find({
      ...query,
      merchant_id: req.merchant_id,
    })
      .populate("category_id", "label")
      .populate("subcategory_id", "label")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      services,
      total,
      pages: Math.ceil(total / limit) || 1,
      currentPage: Number(page),
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch services." });
  }
};

// --- Get Single Service Details ---
export const getServiceDetails = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate("merchant_id", "name email phone profileImage")
      .populate("category_id", "label")
      .populate("subcategory_id", "label");

    if (!service) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found." });
    }

    res.json({ success: true, service });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error retrieving service." });
  }
};

// --- Update Service ---
export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Cast numeric fields if they exist in the update body
    // if (updates.price) updates.price = Number(updates.price);
    // if (updates.discounted_price) updates.discounted_price = Number(updates.discounted_price);

    const service = await Service.findOneAndUpdate(
      { _id: id, merchant_id: req.merchant._id },
      { $set: updates },
      { new: true },
    );

    if (!service) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Service not found or unauthorized.",
        });
    }

    res.json({
      success: true,
      message: "Service updated successfully.",
      service,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- Delete Service (Soft Delete) ---
export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findOneAndUpdate(
      { _id: id, merchant_id: req.merchant._id },
      { is_deleted: true, is_active: false },
      { new: true },
    );

    if (!service) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Service not found or unauthorized.",
        });
    }

    res.json({ success: true, message: "Service moved to trash." });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Could not delete service." });
  }
};

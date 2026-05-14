import Service from "../models/serviceModel.js";

// --- Create Service Listing ---


export const createService = async (req, res) => {
  try {
    const data = { ...req.body };

    // 1. Handle Thumbnail Upload
    if (req.files && req.files.thumbnail) {
      data.thumbnail = `/uploads/${req.files.thumbnail[0].filename}`;
    }

    // 2. Handle Gallery Images Upload
    if (req.files && req.files.images) {
      data.images = req.files.images.map(file => `/uploads/${file.filename}`);
    }

    // 3. Extraction & Manual Validation
    const {
      name,
      description,
      category_id,
      subcategory_id,
      price,
      discounted_price,
      pricing_type,
    } = data;

    if (!name || !description || !price || !data.thumbnail || !pricing_type) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, description, price, thumbnail, and pricing type.",
      });
    }

    // 4. Handle Multer Array Conversion
    // When sending via Form-Data, arrays often arrive as strings or single items
    let categories = category_id;
    if (typeof categories === 'string') categories = [categories];
    
    let subcategories = subcategory_id || [];
    if (typeof subcategories === 'string') subcategories = [subcategories];

    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one category is required.",
      });
    }

    // 5. Pricing Logic
    const basePrice = Number(price);
    const discPrice = discounted_price ? Number(discounted_price) : null;

    if (discPrice !== null && discPrice >= basePrice) {
      return res.status(400).json({
        success: false,
        message: "Discounted price must be lower than the base price.",
      });
    }

    // 6. Initialization
    const newService = new Service({
      ...data,
      merchant_id: req.merchant._id,
      name: name.trim(),
      description: description.trim(),
      category_id: categories,
      subcategory_id: subcategories,
      price: basePrice,
      discounted_price: discPrice,
      images: data.images || [],
      // tags might also need string-to-array conversion if sent from frontend
      tags: typeof data.tags === 'string' ? data.tags.split(',') : (data.tags || []),
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
      merchant_id: req.merchant._id,
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



export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    let updates = { ...req.body };

    // 1. Handle New Thumbnail Upload
    if (req.files && req.files.thumbnail) {
      updates.thumbnail = `/uploads/${req.files.thumbnail[0].filename}`;
    }

    // 2. Handle New Gallery Images Upload
    if (req.files && req.files.images) {
      updates.images = req.files.images.map(file => `/uploads/${file.filename}`);
    }

    // 3. Cast numeric fields for safety
    if (updates.price) updates.price = Number(updates.price);
    if (updates.discounted_price) updates.discounted_price = Number(updates.discounted_price);

    // 4. Handle Multer Array Stringification
    // Ensure category and subcategory are arrays even if one item is sent via form-data
    if (updates.category_id && typeof updates.category_id === 'string') {
        updates.category_id = [updates.category_id];
    }
    if (updates.subcategory_id && typeof updates.subcategory_id === 'string') {
        updates.subcategory_id = [updates.subcategory_id];
    }

    // 5. Update the Database
    const service = await Service.findOneAndUpdate(
      { _id: id, merchant_id: req.merchant._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!service) {
      return res.status(404).json({
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

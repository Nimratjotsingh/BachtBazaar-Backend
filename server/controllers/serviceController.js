import Service from "../models/serviceModel.js";
import ServiceReference from "../models/serviceSuggestionModel.js";
import mongoose from "mongoose";

// Helper to reliably parse service_provider whether sent as JSON string or individual form-data fields
const parseServiceProvider = (body, files) => {
  let provider = null;

  // Case 1: Sent as a stringified JSON object
  if (typeof body.service_provider === "string") {
    try {
      provider = JSON.parse(body.service_provider);
    } catch {
      provider = {};
    }
  } else if (typeof body.service_provider === "object" && body.service_provider !== null) {
    provider = { ...body.service_provider };
  } else if (
    body.provider_name ||
    body["service_provider[name]"] ||
    body.provider_designation ||
    body["service_provider[designation]"]
  ) {
    // Case 2: Sent as flat or bracket-notated form-data keys
    provider = {
      name: body.provider_name || body["service_provider[name]"],
      designation: body.provider_designation || body["service_provider[designation]"],
      experience: body.provider_experience || body["service_provider[experience]"],
      gender: body.provider_gender || body["service_provider[gender]"],
      specialisation: body.provider_specialisation || body["service_provider[specialisation]"],
    };
  }

  if (!provider) return null;

  // Handle uploaded profile image for the provider
  if (files && files.provider_image) {
    provider.profile_image = `/uploads/${files.provider_image[0].filename}`;
  }

  // Type coercions
  if (provider.experience !== undefined && provider.experience !== null) {
    provider.experience = Number(provider.experience) || 0;
  }

  if (typeof provider.specialisation === "string") {
    provider.specialisation = provider.specialisation
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return provider;
};

// --- Search Approved Service Suggestions for Merchant ---
export const searchServiceSuggestions = async (req, res) => {
  try {
    const { search, category_id, limit = 20 } = req.query;

    const filter = { status: "approved", is_active: true };

    if (category_id) {
      filter.category_id = category_id;
    }

    if (search) {
      filter.name = { $regex: String(search).trim(),$options: "i" };
    }

    const suggestions = await ServiceReference.find(filter)
      .populate("category_id", "label")
      .populate("subcategory_id", "label")
      .limit(Number(limit))
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      suggestions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch service suggestions.",
      error: error.message,
    });
  }
};

// --- Create Service Listing ---
const normalizeIdArray = (input) => {
  if (!input) return [];
  let parsed = input;

  if (typeof parsed === "string") {
    const trimmed = parsed.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        parsed = trimmed.replace(/[\[\]"']/g, "").split(",");
      }
    } else if (trimmed.includes(",")) {
      parsed = trimmed.split(",");
    } else {
      parsed = [trimmed];
    }
  }

  if (!Array.isArray(parsed)) parsed = [parsed];

  return parsed
    .flat(Infinity)
    .map((item) => (typeof item === "string" ? item.replace(/[\[\]"'\s]/g, "") : String(item?._id || item)))
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
};

export const createService = async (req, res) => {
  try {
    const data = { ...req.body };
    const merchantId = req.merchant._id;

    // 1. Process Uploaded Files
    let uploadedThumbnail = null;
    if (req.files && req.files.thumbnail && req.files.thumbnail.length > 0) {
      uploadedThumbnail = `/uploads/${req.files.thumbnail[0].filename}`;
    }

    let uploadedImages = [];
    if (req.files && req.files.images && req.files.images.length > 0) {
      uploadedImages = req.files.images.map((file) => `/uploads/${file.filename}`);
    }

    // 2. Parse Provider Sub-document
    const serviceProvider = typeof parseServiceProvider === "function"
      ? parseServiceProvider(req.body, req.files)
      : null;

    // 3. Inspect Suggestion (if merchant selected a pre-approved template)
    let selectedSuggestion = null;
    let isAutoApproved = false;

    if (data.service_id && mongoose.Types.ObjectId.isValid(data.service_id)) {
      selectedSuggestion = await ServiceReference.findOne({
        _id: data.service_id,
        status: "approved",
        is_active: true,
      });

      if (selectedSuggestion) {
        isAutoApproved = true;
      }
    }

    // 4. Auto-Fill Fields from Suggestion OR Fallback to Merchant Inputs
    const finalName = (data.name?.trim() || selectedSuggestion?.name || "").trim();
    const finalDescription = (data.description?.trim() || selectedSuggestion?.description || "").trim();
    
    // Auto-inherit master template image if merchant did not upload a new thumbnail
    const finalThumbnail = uploadedThumbnail || data.thumbnail || selectedSuggestion?.image || null;

    // Inherit categories from suggestion or normalize request payload
    let categories = normalizeIdArray(data.category_id);
    if (categories.length === 0 && selectedSuggestion?.category_id?.length > 0) {
      categories = selectedSuggestion.category_id.map((c) => String(c._id || c));
    }

    let subcategories = normalizeIdArray(data.subcategory_id);
    if (subcategories.length === 0 && selectedSuggestion?.subcategory_id?.length > 0) {
      subcategories = selectedSuggestion.subcategory_id.map((s) => String(s._id || s));
    }

    // 5. Validation Check
    if (!finalName || !finalDescription) {
      return res.status(400).json({
        success: false,
        message: "Service name and description are required.",
      });
    }

    if (!finalThumbnail) {
      return res.status(400).json({
        success: false,
        message: "A service thumbnail is required (upload an image or choose a master suggestion template).",
      });
    }

    if (!data.price ) {
      return res.status(400).json({
        success: false,
        message: "Base price and pricing type are required.",
      });
    }

    if (categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one valid category is required.",
      });
    }

    // 6. Pricing Logic & Validations
    const basePrice = Number(data.price);
    const discPrice =
      data.discounted_price !== undefined &&
      data.discounted_price !== null &&
      data.discounted_price !== ""
        ? Number(data.discounted_price)
        : null;

    if (discPrice !== null && discPrice >= basePrice) {
      return res.status(400).json({
        success: false,
        message: "Discounted price must be strictly lower than the base price.",
      });
    }

    // 7. Route Flow: Auto-Approved vs Custom Verification Flow
    let targetServiceRefId = selectedSuggestion ? selectedSuggestion._id : null;

    if (!isAutoApproved) {
      // Merchant created a custom service -> Register a pending suggestion entry for admin moderation
      const newPendingSuggestion = new ServiceReference({
        name: finalName,
        description: finalDescription,
        image: finalThumbnail,
        category_id: categories,
        subcategory_id: subcategories,
        suggested_by: merchantId,
        status: "pending",
        is_active: false,
      });

      await newPendingSuggestion.save();
      targetServiceRefId = newPendingSuggestion._id;
    }

    // 8. Save Service Listing
    const newService = new Service({
      merchant_id: merchantId,
      service_id: targetServiceRefId,
      name: finalName,
      description: finalDescription,
      thumbnail: finalThumbnail,
      images: uploadedImages.length > 0 ? uploadedImages : (data.images || []),
      category_id: categories,
      subcategory_id: subcategories,
      service_provider: serviceProvider,
      price: basePrice,
      discounted_price: discPrice,
      pricing_type: data.pricing_type,
      tags: typeof data.tags === "string" ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : (data.tags || []),
      approval_status: isAutoApproved ? "approved" : "pending",
      is_active: isAutoApproved, // Custom services stay offline until admin reviews & approves
    });

    await newService.save();

    return res.status(201).json({
      success: true,
      message: isAutoApproved
        ? "Service created and published immediately from master suggestion."
        : "Custom service created. It is currently under review by admin before going live.",
      approval_status: newService.approval_status,
      is_active: newService.is_active,
      service: newService,
    });
  } catch (error) {
    console.error("Create Service Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create service listing.",
    });
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
      approval_status,
      minPrice,
      maxPrice,
      featured,
      pricingType,
    } = req.query;

    const query = { is_deleted: false, merchant_id: req.merchant._id };

    if (search) {
      query.$or = [
        { name: { $regex: search,$options: "i" } },
        { "service_provider.name": { $regex: search,$options: "i" } },
      ];
    }

    if (category) query.category_id = category;
    if (pricingType) query.pricing_type = pricingType;
    if (approval_status) query.approval_status = approval_status;
    if (featured) query.is_featured = featured === "true";

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const total = await Service.countDocuments(query);
    const services = await Service.find(query)
      .populate("category_id", "label")
      .populate("subcategory_id", "label")
      .populate("service_id", "name status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.json({
      success: true,
      services,
      total,
      pages: Math.ceil(total / limit) || 1,
      currentPage: Number(page),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch services." });
  }
};

// --- Get Single Service Details ---
export const getServiceDetails = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate("merchant_id", "name email phone profileImage")
      .populate("category_id", "label")
      .populate("subcategory_id", "label")
      .populate("service_id", "name description image status");

    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found." });
    }

    return res.json({ success: true, service });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error retrieving service." });
  }
};

// --- Update Service ---
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
      updates.images = req.files.images.map((file) => `/uploads/${file.filename}`);
    }

    // 3. Process Service Provider update
    const updatedProvider = parseServiceProvider(req.body, req.files);
    if (updatedProvider) {
      updates.service_provider = updatedProvider;
    }

    // 4. Cast numeric fields
    if (updates.price) updates.price = Number(updates.price);
    if (updates.discounted_price) updates.discounted_price = Number(updates.discounted_price);

    // 5. Handle Array Stringification
    if (updates.category_id && typeof updates.category_id === "string") {
      updates.category_id = updates.category_id.includes(",")
        ? updates.category_id.split(",").map((c) => c.trim())
        : [updates.category_id];
    }
    if (updates.subcategory_id && typeof updates.subcategory_id === "string") {
      updates.subcategory_id = updates.subcategory_id.includes(",")
        ? updates.subcategory_id.split(",").map((s) => s.trim())
        : [updates.subcategory_id];
    }

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

    return res.json({
      success: true,
      message: "Service updated successfully.",
      service,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// --- Delete Service (Soft Delete) ---
export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findOneAndUpdate(
      { _id: id, merchant_id: req.merchant._id },
      { is_deleted: true, is_active: false },
      { new: true }
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found or unauthorized.",
      });
    }

    return res.json({ success: true, message: "Service moved to trash." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not delete service." });
  }
};
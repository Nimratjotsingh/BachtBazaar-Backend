import OfferType from "../models/offer_type.js";

// Helper to determine role and ID from request middleware
const getRequestorDetails = (req) => {
  if (req.admin) return { id: req.admin._id, role: "admin" };
  if (req.merchant) return { id: req.merchant._id, role: "merchant" };
  return { id: null, role: null };
};

// --- Create Offer Type ---
export const createOfferType = async (req, res) => {
  try {
    const { id, role } = getRequestorDetails(req);
    if (!role) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { value, label, description } = req.body;

    if (!value || !label) {
      return res.status(400).json({ success: false, message: "Value and Label are required" });
    }

    // Check if value already exists globally
    const existingType = await OfferType.findOne({ value: value.toLowerCase().trim() });
    if (existingType) {
      return res.status(400).json({ success: false, message: "This offer type value already exists" });
    }

    const newOfferType = new OfferType({
      value: value.toLowerCase().trim(),
      label: label.trim(),
      description: description?.trim(),
      created_by_type: role,
      owner_id: id,
    });

    await newOfferType.save();
    res.status(201).json({ success: true, data: newOfferType });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Read/List Offer Types (Enforcing Visibility Rules) ---
export const getOfferTypes = async (req, res) => {
  try {
    const { id, role } = getRequestorDetails(req);
    if (!role) return res.status(401).json({ success: false, message: "Unauthorized" });

    let query = {};

    if (role === "admin") {
      // Admins only see what they themselves created
      query = { created_by_type: "admin", owner_id: id };
    } else if (role === "merchant") {
      // Merchants see all system types created by admins AND their own custom types
      query = {
        $or: [
          { created_by_type: "admin" }, // Global templates from admins
          { created_by_type: "merchant", owner_id: id } // Merchant's own types
        ]
      };
    }

    const types = await OfferType.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Update Offer Type ---
export const updateOfferType = async (req, res) => {
  try {
    const { id, role } = getRequestorDetails(req);
    const { typeId } = req.params;
    const updates = req.body;

    // Build ownership enforcement query
    // Merchants can only update if created_by_type matches 'merchant' AND owner_id matches their ID
    const targetQuery = { _id: typeId, created_by_type: role, owner_id: id };

    if (updates.value) updates.value = updates.value.toLowerCase().trim();

    const updatedType = await OfferType.findOneAndUpdate(
      targetQuery,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedType) {
      return res.status(404).json({ 
        success: false, 
        message: "Offer Type not found or you do not have permission to edit this record." 
      });
    }

    res.status(200).json({ success: true, message: "Updated successfully", data: updatedType });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- Delete Offer Type ---
export const deleteOfferType = async (req, res) => {
  try {
    const { id, role } = getRequestorDetails(req);
    const { typeId } = req.params;

    // Strict validation: Must match exact creator criteria
    const deletedType = await OfferType.findOneAndDelete({
      _id: typeId,
      created_by_type: role,
      owner_id: id
    });

    if (!deletedType) {
      return res.status(404).json({ 
        success: false, 
        message: "Offer Type not found or you are unauthorized to remove it." 
      });
    }

    res.status(200).json({ success: true, message: "Offer type permanently deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
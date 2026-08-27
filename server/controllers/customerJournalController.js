import CustomerJournal from "../models/CustomerJournalModel.js";
import User from "../models/userModel.js";
import Product from "../models/productModel.js";
import Service from "../models/serviceModel.js";

// Helper: Normalize phone numbers to standard format (+91 prefix)
const normalizePhone = (phone) => {
  if (!phone) return "";
  let cleaned = phone.toString().trim().replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);
  if (cleaned.startsWith("+91")) return cleaned;
  if (cleaned.startsWith("91") && cleaned.length === 12) return `+${cleaned}`;
  if (cleaned.length === 10) return `+91${cleaned}`;
  return cleaned.startsWith("+") ? cleaned : `+91${cleaned}`;
};

/**
 * POST /api/merchant/customer-journal
 * Create a new customer journal entry (supports Product, Service, or Custom items)
 */
export const createJournalEntry = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const {
      customerName,
      phoneNumber,
      items, // JSON string (from FormData) or parsed array
      amountCharged,
      paymentStatus = "PAID",
      notes,
      visitDate,
      shopId,
    } = req.body;

    if (!customerName || !phoneNumber || amountCharged === undefined) {
      return res.status(400).json({
        success: false,
        message: "Customer name, phone number, and amount charged are required.",
      });
    }

    const cleanPhone = normalizePhone(phoneNumber);
    const validStatuses = ["PAID", "DUE", "UPI", "CASH"];
    const formattedPaymentStatus = paymentStatus.toUpperCase();

    if (!validStatuses.includes(formattedPaymentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid paymentStatus. Allowed: ${validStatuses.join(", ")}`,
      });
    }

    // 1. Parse items list (handles JSON array or stringified JSON from FormData)
    let parsedItems = [];
    if (typeof items === "string") {
      try {
        parsedItems = JSON.parse(items);
      } catch {
        parsedItems = [{ title: items.trim(), quantity: 1, totalPrice: Number(amountCharged) }];
      }
    } else if (Array.isArray(items)) {
      parsedItems = items;
    }

    // 2. Resolve items across Product, Service, and Custom
    const resolvedItems = [];
    for (const item of parsedItems) {
      let title = item.title || item.name || "Custom Item";
      let unitPrice = Number(item.unitPrice) || 0;
      let qty = Math.max(1, Number(item.quantity) || 1);
      let totalPrice = Number(item.totalPrice) || unitPrice * qty;
      let itemType = item.itemType ? item.itemType.toUpperCase() : "CUSTOM";
      let referenceId = item.referenceId || null;
      let itemModel = item.itemModel || null;

      // Check if item is linked to a Product catalog ID
      if (item.productId) {
        const dbProduct = await Product.findById(item.productId)
          .select("title name price discount_price")
          .lean();
        if (dbProduct) {
          title = dbProduct.title || dbProduct.name || title;
          unitPrice = Number(item.unitPrice || dbProduct.discount_price || dbProduct.price) || 0;
          totalPrice = unitPrice * qty;
          itemType = "PRODUCT";
          referenceId = dbProduct._id;
          itemModel = "Product";
        }
      }
      // Check if item is linked to a Service catalog ID
      else if (item.serviceId) {
        const dbService = await Service.findById(item.serviceId)
          .select("name title price discountedPrice")
          .lean();
        if (dbService) {
          title = dbService.name || dbService.title || title;
          unitPrice = Number(item.unitPrice || dbService.discountedPrice || dbService.price) || 0;
          totalPrice = unitPrice * qty;
          itemType = "SERVICE";
          referenceId = dbService._id;
          itemModel = "Service";
        }
      }

      resolvedItems.push({
        itemType,
        referenceId,
        itemModel,
        title,
        quantity: qty,
        unitPrice,
        totalPrice,
      });
    }

    // 3. Resolve uploaded media files
    const uploadedImages = [];
    let uploadedVoiceNote = null;

    if (req.files) {
      if (req.files.images?.length) {
        req.files.images.forEach((file) => {
          uploadedImages.push(`/uploads/journal/${file.filename}`);
        });
      }
      if (req.files.voiceNote?.length) {
        uploadedVoiceNote = `/uploads/journal/${req.files.voiceNote[0].filename}`;
      }
    }

    // 4. Auto-link registered user profile if matching phone number exists
    const existingUser = await User.findOne({
      $or: [{ phone: cleanPhone }, { phone: cleanPhone.slice(-10) }],
    }).select("_id");

    const newJournal = new CustomerJournal({
      merchantId,
      shopId: shopId || req.merchant.shopId || null,
      customerId: existingUser?._id || null,
      customerName: customerName.trim(),
      phoneNumber: cleanPhone,
      items: resolvedItems,
      amountCharged: Number(amountCharged),
      paymentStatus: formattedPaymentStatus,
      notes: notes ? notes.trim() : "",
      visitDate: visitDate ? new Date(visitDate) : new Date(),
      images: uploadedImages,
      voiceNote: uploadedVoiceNote,
    });

    await newJournal.save();

    return res.status(201).json({
      success: true,
      message: "Customer entry recorded in journal successfully.",
      data: newJournal,
    });
  } catch (error) {
    console.error("Create Customer Journal Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create customer journal record.",
    });
  }
};

/**
 * GET /api/merchant/customer-journal
 * Fetch journal entries with search, date filters, and financial summary
 */
export const getJournalEntries = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const {
      q,
      paymentStatus,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = { merchantId, isDeleted: false };

    if (paymentStatus) {
      query.paymentStatus = paymentStatus.toUpperCase();
    }

    if (startDate || endDate) {
      query.visitDate = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        query.visitDate.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        query.visitDate.$lte = end;
      }
    }

    if (q && q.trim()) {
      const sanitized = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const digitsOnly = q.replace(/\D/g, "");

      const orConditions = [
        { customerName: { $regex: sanitized, $options: "i" } },
        { "items.title": { $regex: sanitized, $options: "i" } },
      ];

      if (digitsOnly.length >= 3) {
        orConditions.push({ phoneNumber: { $regex: digitsOnly, $options: "i" } });
      }

      query.$or = orConditions;
    }

    const [entries, total, summary] = await Promise.all([
      CustomerJournal.find(query)
        .populate("customerId", "name profileImage email")
        .populate("items.referenceId")
        .sort({ visitDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      CustomerJournal.countDocuments(query),
      CustomerJournal.aggregate([
        { $match: { merchantId, isDeleted: false } },
        {
          $group: {
            _id: "$paymentStatus",
            totalAmount: { $sum: "$amountCharged" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const financialStats = {
      totalCollected: 0,
      totalDue: 0,
      totalUpi: 0,
      totalCash: 0,
      totalOverall: 0,
    };

    summary.forEach((stat) => {
      financialStats.totalOverall += stat.totalAmount;
      if (stat._id === "PAID") financialStats.totalCollected += stat.totalAmount;
      if (stat._id === "DUE") financialStats.totalDue += stat.totalAmount;
      if (stat._id === "UPI") financialStats.totalUpi += stat.totalAmount;
      if (stat._id === "CASH") financialStats.totalCash += stat.totalAmount;
    });

    return res.status(200).json({
      success: true,
      financialSummary: financialStats,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
        hasMore: skip + entries.length < total,
      },
      data: entries,
    });
  } catch (error) {
    console.error("Get Customer Journal Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve journal entries.",
      error: error.message,
    });
  }
};

/**
 * GET /api/merchant/customer-journal/:id
 */
export const getJournalEntryById = async (req, res) => {
  try {
    const { id } = req.params;
    const merchantId = req.merchant._id;

    const entry = await CustomerJournal.findOne({
      _id: id,
      merchantId,
      isDeleted: false,
    })
      .populate("customerId", "name phone profileImage email")
      .populate("items.referenceId")
      .lean();

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Customer journal record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    console.error("Get Journal Entry Details Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/merchant/customer-journal/:id
 */
export const updateJournalEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const merchantId = req.merchant._id;
    const { paymentStatus, notes, amountCharged, customerName, phoneNumber, visitDate } = req.body;

    const entry = await CustomerJournal.findOne({ _id: id, merchantId, isDeleted: false });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Customer journal record not found.",
      });
    }

    if (paymentStatus) {
      const formatted = paymentStatus.toUpperCase();
      if (!["PAID", "DUE", "UPI", "CASH"].includes(formatted)) {
        return res.status(400).json({ success: false, message: "Invalid paymentStatus value." });
      }
      entry.paymentStatus = formatted;
    }

    if (notes !== undefined) entry.notes = notes.trim();
    if (amountCharged !== undefined) entry.amountCharged = Number(amountCharged);
    if (customerName) entry.customerName = customerName.trim();
    if (phoneNumber) entry.phoneNumber = normalizePhone(phoneNumber);
    if (visitDate) entry.visitDate = new Date(visitDate);

    if (req.files) {
      if (req.files.images?.length) {
        req.files.images.forEach((file) => {
          entry.images.push(`/uploads/journal/${file.filename}`);
        });
      }
      if (req.files.voiceNote?.length) {
        entry.voiceNote = `/uploads/journal/${req.files.voiceNote[0].filename}`;
      }
    }

    await entry.save();

    return res.status(200).json({
      success: true,
      message: "Journal entry updated successfully.",
      data: entry,
    });
  } catch (error) {
    console.error("Update Customer Journal Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/merchant/customer-journal/:id
 */
export const deleteJournalEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const merchantId = req.merchant._id;

    const entry = await CustomerJournal.findOne({ _id: id, merchantId, isDeleted: false });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Customer journal record not found.",
      });
    }

    entry.isDeleted = true;
    await entry.save();

    return res.status(200).json({
      success: true,
      message: "Customer journal entry deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Customer Journal Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
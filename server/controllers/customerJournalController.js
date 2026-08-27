import CustomerJournal from "../models/CustomerJournalModel.js";
import User from "../models/userModel.js";

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
 */
export const createJournalEntry = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const {
      customerName,
      phoneNumber,
      service,
      amountCharged,
      paymentStatus = "PAID",
      notes,
      visitDate,
      shopId,
    } = req.body;

    if (!customerName || !phoneNumber || !service || amountCharged === undefined) {
      return res.status(400).json({
        success: false,
        message: "Customer name, phone number, service description, and amount charged are required.",
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

    // Resolve uploaded files
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

    // Auto-link registered user if phone matches
    const existingUser = await User.findOne({
      $or: [{ phone: cleanPhone }, { phone: cleanPhone.slice(-10) }],
    }).select("_id");

    const newJournal = new CustomerJournal({
      merchantId,
      shopId: shopId || req.merchant.shopId || null,
      customerId: existingUser?._id || null,
      customerName: customerName.trim(),
      phoneNumber: cleanPhone,
      service: service.trim(),
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
        { service: { $regex: sanitized, $options: "i" } },
      ];

      if (digitsOnly.length >= 3) {
        orConditions.push({ phoneNumber: { $regex: digitsOnly, $options: "i" } });
      }

      query.$or = orConditions;
    }

    const [entries, total, summary] = await Promise.all([
      CustomerJournal.find(query)
        .populate("customerId", "name profileImage email")
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
    const {
      paymentStatus,
      notes,
      amountCharged,
      customerName,
      phoneNumber,
      service,
      visitDate,
    } = req.body;

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

    if (service) entry.service = service.trim();
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
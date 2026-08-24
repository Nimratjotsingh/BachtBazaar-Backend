import User from "../models/userModel.js";

/**
 * Normalizes phone numbers to standard 10-digit format and +91 international format
 */
const cleanPhoneNumber = (rawPhone) => {
  if (!rawPhone || typeof rawPhone !== "string") return null;

  // Remove spaces, hyphens, brackets, and extra characters
  let digits = rawPhone.replace(/\D/g, "");

  // Strip leading 0 or country code (91) to extract base 10-digit number
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.substring(1);
  } else if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.substring(2);
  }

  // Ensure it's a valid 10-digit mobile number
  if (digits.length !== 10) return null;

  return {
    raw10: digits,
    withCountryCode: `+91${digits}`,
    withoutPlus: `91${digits}`,
  };
};

/**
 * POST /api/user/contacts/sync
 * Body: { contacts: [ { name: "Rahul", phone: "+91 98765-43210" }, ... ] }
 */
export const syncAndCheckContacts = async (req, res) => {
  try {
    const { contacts } = req.body;
    const currentUserId = req.user?._id;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "A non-empty array of contacts is required.",
      });
    }

    // 1. Process & sanitize incoming contact numbers
    const validContactMap = new Map();
    const lookupPhoneNumbers = new Set();

    contacts.forEach((contact) => {
      const parsed = cleanPhoneNumber(contact.phone);
      if (parsed) {
        // Collect all variations for DB matching
        lookupPhoneNumbers.add(parsed.raw10);
        lookupPhoneNumbers.add(parsed.withCountryCode);
        lookupPhoneNumbers.add(parsed.withoutPlus);

        // Store original device contact details indexed by 10-digit string
        if (!validContactMap.has(parsed.raw10)) {
          validContactMap.set(parsed.raw10, {
            originalName: contact.name?.trim() || "Unknown",
            originalPhone: contact.phone,
            clean10: parsed.raw10,
          });
        }
      }
    });

    const phoneQueryList = Array.from(lookupPhoneNumbers);

    // 2. Query matching users from database (exclude current user and soft-deleted/banned accounts)
    const existingUsers = await User.find({
      phone: { $in: phoneQueryList },
      _id: { $ne: currentUserId },
      isDeleted: { $ne: true },
      status: { $ne: "banned" },
    })
      .select("name phone profileImage city createdAt referralCode")
      .lean();

    // 3. Map registered users
    const matched10Digits = new Set();

    const registeredUsers = existingUsers.map((user) => {
      const parsed = cleanPhoneNumber(user.phone);
      const clean10 = parsed ? parsed.raw10 : user.phone;
      matched10Digits.add(clean10);

      const localContact = validContactMap.get(clean10);

      return {
        userId: user._id,
        registeredName: user.name || "BachatBazarr User",
        contactBookName: localContact?.originalName || user.name || "",
        phone: user.phone,
        city: user.city || null,
        isRegistered: true,
      };
    });

    // 4. Extract contacts not yet registered on the platform
    const nonRegisteredContacts = [];

    validContactMap.forEach((contact, clean10) => {
      if (!matched10Digits.has(clean10)) {
        nonRegisteredContacts.push({
          contactBookName: contact.originalName,
          phone: contact.originalPhone,
          formattedPhone: `+91${clean10}`,
          isRegistered: false,
        });
      }
    });

    return res.status(200).json({
      success: true,
      summary: {
        totalReceived: contacts.length,
        totalValid: validContactMap.size,
        registeredCount: registeredUsers.length,
        nonRegisteredCount: nonRegisteredContacts.length,
      },
      data: {
        registeredUsers,
        nonRegisteredContacts,
      },
    });
  } catch (error) {
    console.error("Contact Sync Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check contact list.",
      error: error.message,
    });
  }
};
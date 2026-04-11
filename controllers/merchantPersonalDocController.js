import Merchant from "../models/merchantModel.js";
import MerchantPersonalDoc from "../models/merchantPersonalDocModel.js";
import axios from "axios";

const verifyPanWithCashfree = async (pan, name, dob) => {
  const response = await axios.post(
    "https://sandbox.cashfree.com/verification/pan-lite",
    {
      verification_id: `ver_${Date.now()}`,
      pan,
      name,
      dob
    },
    {
      headers: {
        "x-client-id": process.env.CASHFREE_CLIENT_ID,
        "x-client-secret": process.env.CASHFREE_SECRET_KEY
      }
    }
  );

  return response.data;
};

export const upsertPersonalDocs = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.merchant._id);
    if (!merchant) return res.status(404).json({ message: "Merchant not found" });

    const { aadharNumber, panNumber, name, dob } = req.body;
    const aadharImageFile = req.files?.aadharImage?.[0];
    const panImageFile = req.files?.panImage?.[0];

    const hasAadhar = !!(aadharNumber && aadharImageFile);
    const hasPan = !!(panNumber && panImageFile && name && dob);

    if (!hasAadhar && !hasPan) {
      return res.status(400).json({ message: "Provide Aadhaar OR PAN with required fields" });
    }

    const update = {};

    if (hasAadhar) {
      update.aadharNumber = aadharNumber;
      update.aadharImage = {
        data: aadharImageFile.buffer,
        contentType: aadharImageFile.mimetype
      };
    }

    if (hasPan) {
      const pan = panNumber.toUpperCase();
      const panRes = await verifyPanWithCashfree(pan, name, dob);
      if (panRes.status !== "VALID") {
        return res.status(400).json({ message: "Invalid PAN" });
      }

      update.panNumber = pan;
      update.panImage = {
        data: panImageFile.buffer,
        contentType: panImageFile.mimetype
      };
    }

    const doc = await MerchantPersonalDoc.findOneAndUpdate(
      { merchantId: req.merchant._id },
      { $set: update, $setOnInsert: { merchantId: req.merchant._id } },
      { new: true, upsert: true }
    );

    return res.json({ success: true, personalDocsId: doc._id });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Upload failed" });
  }
};

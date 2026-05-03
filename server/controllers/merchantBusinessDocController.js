import Merchant from "../models/merchantModel.js";
import MerchantBusinessDoc from "../models/merchantBusinessDocModel.js";

export const upsertBusinessDocs = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.merchant._id);
    if (!merchant) return res.status(404).json({ message: "Merchant not found" });

    const update = {};

    if (req.body.gstNumber) update.gstNumber = req.body.gstNumber;
    if (req.body.tradeLicenseNumber) update.tradeLicenseNumber = req.body.tradeLicenseNumber;
    if (req.body.shopRegistrationNumber) update.shopRegistrationNumber = req.body.shopRegistrationNumber;
    if (req.body.fssaiNumber) update.fssaiNumber = req.body.fssaiNumber;
    if (req.body.panNumber) update.panNumber = String(req.body.panNumber).toUpperCase();

    const gstImageFile = req.files?.gstImage?.[0];
    const tradeLicenseImageFile = req.files?.tradeLicenseImage?.[0];
    const shopRegistrationImageFile = req.files?.shopRegistrationImage?.[0];
    const fssaiImageFile = req.files?.fssaiImage?.[0];
    const panImageFile = req.files?.panImage?.[0];

    if (gstImageFile) {
      update.gstImage = {
        data: gstImageFile.buffer,
        contentType: gstImageFile.mimetype
      };
    }

    if (tradeLicenseImageFile) {
      update.tradeLicenseImage = {
        data: tradeLicenseImageFile.buffer,
        contentType: tradeLicenseImageFile.mimetype
      };
    }

    if (shopRegistrationImageFile) {
      update.shopRegistrationImage = {
        data: shopRegistrationImageFile.buffer,
        contentType: shopRegistrationImageFile.mimetype
      };
    }

    if (fssaiImageFile) {
      update.fssaiImage = {
        data: fssaiImageFile.buffer,
        contentType: fssaiImageFile.mimetype
      };
    }

    if (panImageFile) {
      update.panImage = {
        data: panImageFile.buffer,
        contentType: panImageFile.mimetype
      };
    }

    const hasPayload = Object.keys(update).length > 0;
    if (!hasPayload) {
      return res.status(400).json({ message: "No business docs payload provided" });
    }


    const doc = await MerchantBusinessDoc.findOneAndUpdate(
      { merchantId: req.merchant._id },
      { $set: update, $setOnInsert: { merchantId: req.merchant._id } },
      { new: true, upsert: true }
    );
    await Merchant.findByIdAndUpdate(req.merchant._id, {
      status: "pending"
    });

    return res.json({ success: true, businessDocsId: doc._id });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Upload failed" });
  }
};

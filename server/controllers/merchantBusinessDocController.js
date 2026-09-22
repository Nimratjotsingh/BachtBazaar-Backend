import Merchant from "../models/merchantModel.js";
import MerchantBusinessDoc from "../models/merchantBusinessDocModel.js";
import {dispatchAsyncAadhaarVerification,dispatchAsyncPanVerification,fetchTaskStatusFromIdfy,normalizeToYYYYMMDD, dispatchAsyncFssaiVerification} from '../services/idfyService.js'
import fs from "fs/promises";

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
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const AADHAAR_REGEX = /^[0-9]{12}$/;

/**
 * 1. Request Async PAN Verification
 * POST /api/merchant/business-docs/pan/request
 */
export const requestPanVerification = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { panNumber, fullName, name, dob, dateOfBirth } = req.body;

    const cleanPan = String(panNumber || "").trim().toUpperCase();
    const cleanName = String(fullName || name || "").trim();
    const rawDob = dob || dateOfBirth;

    if (!cleanPan || !PAN_REGEX.test(cleanPan)) {
      return res.status(400).json({
        success: false,
        message: "A valid 10-character PAN card number is required.",
      });
    }

    const formattedDob = rawDob ? normalizeToYYYYMMDD(rawDob) : "";

    // Dispatch async job
    const idfyResponse = await dispatchAsyncPanVerification({
      panNumber: cleanPan,
      fullName: cleanName,
      dob: formattedDob,
    });

    const requestId = idfyResponse?.request_id;
    if (!requestId) {
      return res.status(502).json({
        success: false,
        message: "Failed to initiate verification with IDfy.",
        rawResponse: idfyResponse,
      });
    }

    // Save in-progress state
    await MerchantBusinessDoc.findOneAndUpdate(
      { merchantId },
      {
        $set: {
          panNumber: cleanPan,
          "verificationResults.pan": {
            status: "in_progress",
            requestId,
            submittedAt: new Date(),
          },
        },
        $setOnInsert: { merchantId },
      },
      { upsert: true }
    );

    return res.status(202).json({
      success: true,
      message: "PAN verification request submitted.",
      requestId,
    });
  } catch (error) {
    console.error("Async PAN Request Error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to submit PAN verification request.",
      error: error.message,
    });
  }
};

/**
 * 2. Request Async Aadhaar Verification
 * POST /api/merchant/business-docs/aadhaar/request
 */
export const requestAadhaarVerification = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { aadhaarNumber } = req.body;
    const cleanAadhaar = String(aadhaarNumber || "").replace(/\s+/g, "");

    if (!cleanAadhaar || !AADHAAR_REGEX.test(cleanAadhaar)) {
      return res.status(400).json({
        success: false,
        message: "A valid 12-digit Aadhaar number is required.",
      });
    }

    // Dispatch async job
    const idfyResponse = await dispatchAsyncAadhaarVerification({
      aadhaarNumber: cleanAadhaar,
    });

    const requestId = idfyResponse?.request_id;
    if (!requestId) {
      return res.status(502).json({
        success: false,
        message: "Failed to initiate Aadhaar verification with IDfy.",
        rawResponse: idfyResponse,
      });
    }

    // Save in-progress state
    await MerchantBusinessDoc.findOneAndUpdate(
      { merchantId },
      {
        $set: {
          aadhaarNumber: cleanAadhaar,
          "verificationResults.aadhaar": {
            status: "in_progress",
            requestId,
            submittedAt: new Date(),
          },
        },
        $setOnInsert: { merchantId },
      },
      { upsert: true }
    );

    return res.status(202).json({
      success: true,
      message: "Aadhaar verification request submitted.",
      requestId,
    });
  } catch (error) {
    console.error("Async Aadhaar Request Error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to submit Aadhaar verification request.",
      error: error.message,
    });
  }
};



const FSSAI_REGEX = /^[0-9]{14}$/;

/**
 * Request Async FSSAI License Verification
 * POST /api/merchant/business-docs/fssai/request
 */
export const requestFssaiVerification = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { fssaiNumber } = req.body;
    const cleanFssai = String(fssaiNumber || "").trim();

    if (!cleanFssai || !FSSAI_REGEX.test(cleanFssai)) {
      return res.status(400).json({
        success: false,
        message: "A valid 14-digit FSSAI license/registration number is required.",
      });
    }

    const idfyResponse = await dispatchAsyncFssaiVerification({
      fssaiNumber: cleanFssai,
    });

    const requestId = idfyResponse?.request_id;
    if (!requestId) {
      return res.status(502).json({
        success: false,
        message: "Failed to initiate FSSAI verification with IDfy.",
        rawResponse: idfyResponse,
      });
    }

    // Record pending task in database
    await MerchantBusinessDoc.findOneAndUpdate(
      { merchantId },
      {
        $set: {
          fssaiNumber: cleanFssai,
          "verificationResults.fssai": {
            status: "in_progress",
            requestId,
            submittedAt: new Date(),
          },
        },
        $setOnInsert: { merchantId },
      },
      { upsert: true }
    );

    return res.status(202).json({
      success: true,
      message: "FSSAI verification request submitted.",
      requestId,
    });
  } catch (error) {
    console.error("Async FSSAI Request Error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to submit FSSAI verification request.",
      error: error.message,
    });
  }
};
/**
 * 3. Unified Status Check Endpoint
 * GET /api/merchant/business-docs/task-status/:requestId
 */
export const checkTaskStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const merchantId = req.merchant._id;

    if (!requestId) {
      return res.status(400).json({ success: false, message: "Request ID is required." });
    }

    const taskResult = await fetchTaskStatusFromIdfy(requestId);

    // 1. Task still processing with the government gateway
    if (taskResult.status === "in_progress") {
      return res.status(202).json({
        success: true,
        status: "in_progress",
        message: taskResult.message || "Verification is in progress with the source registry.",
      });
    }

    // 2. Task not found on IDfy
    if (taskResult.status === "not_found") {
      return res.status(404).json({
        success: false,
        message: taskResult.message || "No task found matching the provided request ID.",
      });
    }

    // 3. Build atomic database update based on document task type
    const updateDoc = {};
    const isVerified = taskResult.isValid === true;

    if (taskResult.type === "ind_pan") {
      if (taskResult.panNumber) {
        updateDoc.panNumber = taskResult.panNumber;
      }
      updateDoc["verificationResults.pan"] = {
        status: taskResult.status,
        requestId,
        verifiedAt: isVerified ? new Date() : null,
        panStatus: taskResult.panStatusText,
        registeredName: taskResult.registeredName,
        nameMatch: taskResult.nameMatch,
        dobMatch: taskResult.dobMatch,
        aadhaarSeedingStatus: taskResult.aadhaarSeedingStatus,
        failureReason: taskResult.failureReason,
        rawResponse: taskResult.rawResponse,
      };
    } else if (taskResult.type === "ind_aadhaar") {
      updateDoc["verificationResults.aadhaar"] = {
        status: taskResult.status,
        requestId,
        verifiedAt: isVerified ? new Date() : null,
        state: taskResult.state,
        gender: taskResult.gender,
        ageBand: taskResult.ageBand,
        failureReason: taskResult.failureReason,
        rawResponse: taskResult.rawResponse,
      };
    } else if (taskResult.type === "ind_fssai") {
      if (taskResult.licenseNumber) {
        updateDoc.fssaiNumber = taskResult.licenseNumber;
      }
      updateDoc["verificationResults.fssai"] = {
        status: taskResult.status,
        requestId,
        verifiedAt: isVerified ? new Date() : null,
        companyName: taskResult.companyName,
        licenseStatus: taskResult.licenseStatus,
        validFrom: taskResult.validFrom,
        validUpto: taskResult.validUpto,
        address: taskResult.address,
        failureReason: taskResult.failureReason,
        rawResponse: taskResult.rawResponse,
      };
    } else {
      // Fallback generic task logger
      updateDoc[`verificationResults.${taskResult.type || "unknown"}`] = {
        status: taskResult.status,
        requestId,
        verifiedAt: isVerified ? new Date() : null,
        rawResponse: taskResult.rawResponse,
      };
    }

    // 4. Update the business document record
    const updatedBusinessDoc = await MerchantBusinessDoc.findOneAndUpdate(
      { merchantId },
      { $set: updateDoc,$setOnInsert: { merchantId } },
      { new: true, upsert: true }
    );

    // 5. Build clean, sanitized response payload
    const responseData = {
      type: taskResult.type,
      status: taskResult.status,
      isValid: taskResult.isValid,
      failureReason: taskResult.failureReason,
    };

    if (taskResult.type === "ind_pan") {
      responseData.panStatus = taskResult.panStatusText;
      responseData.nameMatch = taskResult.nameMatch;
      responseData.dobMatch = taskResult.dobMatch;
      responseData.aadhaarSeeded = taskResult.aadhaarSeedingStatus;
    } else if (taskResult.type === "ind_aadhaar") {
      responseData.state = taskResult.state;
      responseData.gender = taskResult.gender;
      responseData.ageBand = taskResult.ageBand;
    } else if (taskResult.type === "ind_fssai") {
      responseData.companyName = taskResult.companyName;
      responseData.licenseStatus = taskResult.licenseStatus;
      responseData.validFrom = taskResult.validFrom;
      responseData.validUpto = taskResult.validUpto;
      responseData.address = taskResult.address;
    }

    return res.status(isVerified ? 200 : 422).json({
      success: isVerified,
      status: taskResult.status,
      type: taskResult.type,
      message: isVerified
        ? "Document verified successfully with source registry."
        : `Verification failed: ${taskResult.failureReason}`,
      data: responseData,
    });
  } catch (error) {
    console.error("Task Status Check Error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while retrieving verification status.",
      error: error.message,
    });
  }
};
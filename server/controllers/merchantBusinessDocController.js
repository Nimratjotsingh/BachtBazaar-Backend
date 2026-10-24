import Merchant from "../models/merchantModel.js";
import MerchantBusinessDoc from "../models/merchantBusinessDocModel.js";
import {dispatchAsyncAadhaarVerification,dispatchAsyncPanVerification,fetchTaskStatusFromIdfy,normalizeToYYYYMMDD, dispatchAsyncGstVerification,dispatchAsyncFssaiVerification,dispatchAsyncDrivingLicenseVerification,dispatchAsyncUdyamVerification} from '../services/idfyService.js'
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
    
    // --- Udyam Number Mapping ---
    if (req.body.udhyamNumber || req.body.uamNumber || req.body.udyamNumber) {
      update.udhyamNumber = String(req.body.udhyamNumber || req.body.uamNumber || req.body.udyamNumber).trim().toUpperCase();
    }

    const gstImageFile = req.files?.gstImage?.[0];
    const tradeLicenseImageFile = req.files?.tradeLicenseImage?.[0];
    const shopRegistrationImageFile = req.files?.shopRegistrationImage?.[0];
    const fssaiImageFile = req.files?.fssaiImage?.[0];
    const panImageFile = req.files?.panImage?.[0];
    const udhyamImageFile = req.files?.udhyamImage?.[0] || req.files?.udyamImage?.[0];

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

    // --- Udyam Image Mapping ---
    if (udhyamImageFile) {
      update.udhyamImage = {
        data: udhyamImageFile.buffer,
        contentType: udhyamImageFile.mimetype
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
    
    // --- Updated Merchant Status & Blue Tick Verification Status ---
    await Merchant.findByIdAndUpdate(req.merchant._id, {
      blueTickStatus: "pending"
    });

    return res.json({ success: true, businessDocsId: doc._id });
  } catch (error) {
    console.error("Upsert Business Docs Error:", error);
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


export const checkUdyamTaskStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const merchantId = req.merchant._id;

    if (!requestId) {
      return res.status(400).json({ success: false, message: "Request ID is required." });
    }

    // Fetch the task result from IDfy
    const taskResult = await fetchTaskStatusFromIdfy(requestId);

    // 1. Task still processing with the government gateway
    if (taskResult.status === "in_progress") {
      return res.status(202).json({
        success: true,
        status: "in_progress",
        message: taskResult.message || "Udyam verification is in progress with the source registry.",
      });
    }

    // 2. Task not found on IDfy
    if (taskResult.status === "not_found") {
      return res.status(404).json({
        success: false,
        message: taskResult.message || "No Udyam task found matching the provided request ID.",
      });
    }

    const isVerified = taskResult.isValid === true || taskResult.status === "completed";
    const sourceOutput = taskResult.sourceOutput || taskResult.rawResponse?.result?.source_output || {};
    const generalDetails = sourceOutput.general_details || {};
    const officialAddress = sourceOutput.official_address || {};

    // 3. Build atomic database update for MerchantBusinessDoc
    const updateDoc = {};
    
    // Extract Udyam / UAM number if present in input or raw response
    const uamNumber = taskResult.uamNumber || taskResult.udyamNumber || generalDetails.uam_number || null;
    if (uamNumber) {
      updateDoc.udhyamNumber = uamNumber;
    }

    updateDoc["verificationResults.udyam"] = {
      status: taskResult.status,
      requestId,
      verifiedAt: isVerified ? new Date() : null,
      enterpriseName: generalDetails.enterprise_name || taskResult.enterpriseName,
      majorActivity: generalDetails.major_activity || taskResult.majorActivity,
      organizationType: generalDetails.organization_type || taskResult.organizationType,
      socialCategory: generalDetails.social_category || taskResult.socialCategory,
      state: officialAddress.state || generalDetails.state,
      district: officialAddress.district || generalDetails.district,
      dateOfIncorporation: generalDetails.date_of_inc || taskResult.dateOfIncorporation,
      failureReason: taskResult.failureReason,
      rawResponse: taskResult.rawResponse,
    };

    // Update the business document record
    await MerchantBusinessDoc.findOneAndUpdate(
      { merchantId },
      { $set: updateDoc, $setOnInsert: { merchantId } },
      { new: true, upsert: true }
    );

    // =========================================================================
    // 4. EXTRACT DETAILS FOR VERIFICATION AUDIT LOG
    // =========================================================================
    const extractedName = generalDetails.enterprise_name || taskResult.enterpriseName || null;
    const extractedDocNumber = uamNumber || null;

    // Save into the Verification Log Model
    await MerchantVerificationLog.findOneAndUpdate(
      { requestId },
      {
        merchantId,
        requestId,
        taskId: taskResult.taskId || null,
        groupId: taskResult.groupId || null,
        type: taskResult.type || "udyam_aadhaar",
        status: taskResult.status,
        action: taskResult.action || "verify_with_source",
        isValid: isVerified,
        name: extractedName,
        documentNumber: extractedDocNumber,
        resultOutput: sourceOutput,
        rawApiResponse: taskResult.rawResponse || {},
        completedAt: taskResult.completedAt ? new Date(taskResult.completedAt) : new Date(),
      },
      { upsert: true, new: true }
    );

    // 5. Build clean, sanitized response payload tailored for Udyam
    const responseData = {
      type: taskResult.type || "udyam_aadhaar",
      status: taskResult.status,
      isValid: isVerified,
      uamNumber: extractedDocNumber,
      enterpriseName: extractedName,
      majorActivity: generalDetails.major_activity || null,
      organizationType: generalDetails.organization_type || null,
      state: officialAddress.state || null,
      district: officialAddress.district || null,
      officialAddress: {
        door: officialAddress.door || "",
        road: officialAddress.road || "",
        city: officialAddress.city || "",
        district: officialAddress.district || "",
        state: officialAddress.state || "",
        pin: officialAddress.pin || "",
      },
      failureReason: taskResult.failureReason,
    };

    return res.status(isVerified ? 200 : 422).json({
      success: isVerified,
      status: taskResult.status,
      type: taskResult.type || "udyam_aadhaar",
      message: isVerified
        ? "Udyam Aadhaar verified successfully with source registry."
        : `Verification failed: ${taskResult.failureReason || "Invalid Udyam details"}`,
      data: responseData,
    });
  } catch (error) {
    console.error("Udyam Task Status Check Error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while retrieving Udyam verification status.",
      error: error.message,
    });
  }
};
const UDYAM_REGEX = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/i;

/**
 * Request Async Udyam Aadhaar Verification
 * POST /api/merchant/business-docs/udyam/request
 */
export const requestUdyamVerification = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { udhyamNumber, uamNumber, udyamNumber } = req.body;

    const targetUdyam = String(udhyamNumber || uamNumber || udhyamNumber || "").trim().toUpperCase();

    if (!targetUdyam || !UDYAM_REGEX.test(targetUdyam)) {
      return res.status(400).json({
        success: false,
        message: "A valid Udyam registration number (e.g., UDYAM-XX-00-0000000) is required.",
      });
    }

    const idfyResponse = await dispatchAsyncUdyamVerification({
      uamNumber: targetUdyam,
    });

    const requestId = idfyResponse?.request_id;
    if (!requestId) {
      return res.status(502).json({
        success: false,
        message: "Failed to initiate Udyam verification with IDfy.",
        rawResponse: idfyResponse,
      });
    }

    // Persist pending task in database
    await MerchantBusinessDoc.findOneAndUpdate(
      { merchantId },
      {
        $set: {
          udhyamNumber: targetUdyam,
          "verificationResults.udyam": {
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
      message: "Udyam verification request submitted successfully.",
      requestId,
    });
  } catch (error) {
    console.error("Async Udyam Request Error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to submit Udyam verification request.",
      error: error.response?.data?.message || error.message,
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
    const { fssaiNumber, registration_no, registrationNo } = req.body;
    
    // Support multiple common field names from client payloads
    const targetFssai = String(fssaiNumber || registration_no || registrationNo || "").trim();

    if (!targetFssai || !FSSAI_REGEX.test(targetFssai)) {
      return res.status(400).json({
        success: false,
        message: "A valid 14-digit FSSAI license/registration number is required.",
      });
    }

    const idfyResponse = await dispatchAsyncFssaiVerification({
      fssaiNumber: targetFssai,
    });

    const requestId = idfyResponse?.request_id;
    if (!requestId) {
      return res.status(502).json({
        success: false,
        message: "Failed to initiate FSSAI verification with IDfy.",
        rawResponse: idfyResponse,
      });
    }

    // Persist pending task in database
    await MerchantBusinessDoc.findOneAndUpdate(
      { merchantId },
      {
        $set: {
          fssaiNumber: targetFssai,
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
      error: error.response?.data?.message || error.message,
    });
  }
};
/**
 * 3. Unified Status Check Endpoint
 * GET /api/merchant/business-docs/task-status/:requestId
 */


import MerchantVerificationLog from "../models/MerchantVerificationLogModel.js";

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
    } else if (taskResult.type === "ind_driving_license") {
      if (taskResult.dlNumber) {
        updateDoc.drivingLicenseNumber = taskResult.dlNumber;
      }
      updateDoc["verificationResults.drivingLicense"] = {
        status: taskResult.status,
        requestId,
        verifiedAt: isVerified ? new Date() : null,
        holderName: taskResult.holderName,
        dateOfBirth: taskResult.dateOfBirth,
        fatherOrHusbandName: taskResult.fatherOrHusbandName,
        dlStatus: taskResult.dlStatus,
        issueDate: taskResult.issueDate,
        validFrom: taskResult.validFrom,
        validUpto: taskResult.validUpto,
        vehicleClasses: taskResult.vehicleClasses,
        covDetails: taskResult.covDetails,
        address: taskResult.address,
        rto: taskResult.rto,
        failureReason: taskResult.failureReason,
        rawResponse: taskResult.rawResponse,
      };
    } else if (taskResult.type === "ind_gst_certificate") {
      if (taskResult.gstin) {
        updateDoc.gstNumber = taskResult.gstin;
      }
      updateDoc["verificationResults.gst"] = {
        status: taskResult.status,
        requestId,
        verifiedAt: isVerified ? new Date() : null,
        legalName: taskResult.legalName,
        tradeName: taskResult.tradeName,
        constitutionOfBusiness: taskResult.constitutionOfBusiness,
        taxpayerType: taskResult.taxpayerType,
        gstinStatus: taskResult.gstinStatus,
        dateOfRegistration: taskResult.dateOfRegistration,
        cancellationDate: taskResult.cancellationDate,
        principalPlaceOfBusiness: taskResult.principalPlaceOfBusiness,
        stateJurisdiction: taskResult.stateJurisdiction,
        centerJurisdiction: taskResult.centerJurisdiction,
        natureOfBusinessActivities: taskResult.natureOfBusinessActivities,
        failureReason: taskResult.failureReason,
        rawResponse: taskResult.rawResponse,
      };
    } else if (taskResult.type === "udyam_aadhaar" || taskResult.type === "ind_udyam") {
      if (taskResult.uamNumber || taskResult.udyamNumber) {
        updateDoc.udhyamNumber = taskResult.uamNumber || taskResult.udyamNumber;
      }
      updateDoc["verificationResults.udyam"] = {
        status: taskResult.status,
        requestId,
        verifiedAt: isVerified ? new Date() : null,
        enterpriseName: taskResult.enterpriseName,
        majorActivity: taskResult.majorActivity,
        organizationType: taskResult.organizationType,
        socialCategory: taskResult.socialCategory,
        state: taskResult.state,
        district: taskResult.district,
        dateOfIncorporation: taskResult.dateOfIncorporation,
        failureReason: taskResult.failureReason,
        rawResponse: taskResult.rawResponse,
      };
    } else {
      updateDoc[`verificationResults.${taskResult.type || "unknown"}`] = {
        status: taskResult.status,
        requestId,
        verifiedAt: isVerified ? new Date() : null,
        rawResponse: taskResult.rawResponse,
      };
    }

    // 4. Update the business document record
    await MerchantBusinessDoc.findOneAndUpdate(
      { merchantId },
      { $set: updateDoc, $setOnInsert: { merchantId } },
      { new: true, upsert: true }
    );

    // =========================================================================
    // 5. EXTRACT NAME, DOCUMENT NUMBER & DOB ACROSS DIFFERENT ID TYPES
    // =========================================================================
    let extractedName = null;
    let extractedDocNumber = null;
    let extractedDob = null;

    if (taskResult.type === "ind_pan") {
      extractedName = taskResult.registeredName || taskResult.sourceOutput?.input_details?.input_name || null;
      extractedDocNumber = taskResult.panNumber || null;
      extractedDob = taskResult.sourceOutput?.input_details?.input_dob || null;
    } else if (taskResult.type === "ind_driving_license") {
      extractedName = taskResult.holderName || null;
      extractedDocNumber = taskResult.dlNumber || null;
      extractedDob = taskResult.dateOfBirth || null;
    } else if (taskResult.type === "ind_gst_certificate") {
      extractedName = taskResult.legalName || taskResult.tradeName || null;
      extractedDocNumber = taskResult.gstin || null;
    } else if (taskResult.type === "ind_fssai") {
      extractedName = taskResult.companyName || null;
      extractedDocNumber = taskResult.licenseNumber || null;
    } else if (taskResult.type === "udyam_aadhaar" || taskResult.type === "ind_udyam") {
      extractedName = taskResult.enterpriseName || null;
      extractedDocNumber = taskResult.uamNumber || taskResult.udyamNumber || null;
    } else if (taskResult.type === "ind_aadhaar") {
      extractedName = taskResult.name || null;
    }

    // Fallback search in raw response if specific fields weren't caught
    if (!extractedDocNumber) {
      extractedDocNumber = 
        taskResult.panNumber || 
        taskResult.licenseNumber || 
        taskResult.dlNumber || 
        taskResult.gstin || 
        taskResult.uamNumber ||
        taskResult.udyamNumber ||
        null;
    }

    // =========================================================================
    // 6. SAVE INTO THE VERIFICATION LOG MODEL WITH EXTRACTED FIELDS
    // =========================================================================
    await MerchantVerificationLog.findOneAndUpdate(
      { requestId },
      {
        merchantId,
        requestId,
        taskId: taskResult.taskId || null,
        groupId: taskResult.groupId || null,
        type: taskResult.type,
        status: taskResult.status,
        action: taskResult.action || "verify_with_source",
        isValid: isVerified,
        name: extractedName,
        documentNumber: extractedDocNumber,
        dob: extractedDob,
        resultOutput: taskResult.sourceOutput || taskResult.rawResponse?.result?.source_output || {},
        rawApiResponse: taskResult.rawResponse || {},
        completedAt: taskResult.completedAt ? new Date(taskResult.completedAt) : new Date(),
      },
      { upsert: true, new: true }
    );

    // 7. Build clean, sanitized response payload
    const responseData = {
      type: taskResult.type,
      status: taskResult.status,
      isValid: taskResult.isValid,
      failureReason: taskResult.failureReason,
    };

    if (taskResult.type === "ind_pan") {
      responseData.panNumber = taskResult.panNumber;
      responseData.registeredName = taskResult.registeredName;
      responseData.panStatus = taskResult.panStatusText;
      responseData.nameMatch = taskResult.nameMatch;
      responseData.dobMatch = taskResult.dobMatch;
      responseData.aadhaarSeeded = taskResult.aadhaarSeedingStatus;
    } else if (taskResult.type === "ind_aadhaar") {
      responseData.state = taskResult.state;
      responseData.gender = taskResult.gender;
      responseData.ageBand = taskResult.ageBand;
    } else if (taskResult.type === "ind_fssai") {
      responseData.licenseNumber = taskResult.licenseNumber;
      responseData.companyName = taskResult.companyName;
      responseData.licenseStatus = taskResult.licenseStatus;
      responseData.validFrom = taskResult.validFrom;
      responseData.validUpto = taskResult.validUpto;
      responseData.address = taskResult.address;
    } else if (taskResult.type === "ind_driving_license") {
      responseData.dlNumber = taskResult.dlNumber;
      responseData.holderName = taskResult.holderName;
      responseData.dateOfBirth = taskResult.dateOfBirth;
      responseData.fatherOrHusbandName = taskResult.fatherOrHusbandName;
      responseData.dlStatus = taskResult.dlStatus;
      responseData.issueDate = taskResult.issueDate;
      responseData.validFrom = taskResult.validFrom;
      responseData.validUpto = taskResult.validUpto;
      responseData.vehicleClasses = taskResult.vehicleClasses;
      responseData.address = taskResult.address;
      responseData.rto = taskResult.rto;
    } else if (taskResult.type === "ind_gst_certificate") {
      responseData.gstin = taskResult.gstin;
      responseData.legalName = taskResult.legalName;
      responseData.tradeName = taskResult.tradeName;
      responseData.constitutionOfBusiness = taskResult.constitutionOfBusiness;
      responseData.taxpayerType = taskResult.taxpayerType;
      responseData.gstinStatus = taskResult.gstinStatus;
      responseData.dateOfRegistration = taskResult.dateOfRegistration;
      responseData.principalPlaceOfBusiness = taskResult.principalPlaceOfBusiness;
    } else if (taskResult.type === "udyam_aadhaar" || taskResult.type === "ind_udyam") {
      responseData.uamNumber = taskResult.uamNumber || taskResult.udyamNumber;
      responseData.enterpriseName = taskResult.enterpriseName;
      responseData.majorActivity = taskResult.majorActivity;
      responseData.organizationType = taskResult.organizationType;
      responseData.state = taskResult.state;
      responseData.district = taskResult.district;
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

const DL_REGEX = /^[A-Z]{2}[0-9]{2}[0-9A-Z]{7,12}$/i;

/**
 * Dispatch Async DL Verification Request
 * POST /api/merchant/business-docs/driving-license/request
 */
export const requestDrivingLicenseVerification = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { dlNumber, drivingLicenseNumber, dob, dateOfBirth } = req.body;

    const targetDl = String(drivingLicenseNumber || dlNumber || "")
      .replace(/[\s-]/g, "")
      .toUpperCase();
    const rawDob = dob || dateOfBirth;

    if (!targetDl) {
      return res.status(400).json({
        success: false,
        message: "Driving license number is required.",
      });
    }

    if (!rawDob) {
      return res.status(400).json({
        success: false,
        message: "Date of birth (YYYY-MM-DD) is required for driving license verification.",
      });
    }

    const formattedDob = normalizeToYYYYMMDD(rawDob);
    if (!formattedDob) {
      return res.status(400).json({
        success: false,
        message: "Invalid Date of Birth format. Please provide YYYY-MM-DD or DD-MM-YYYY.",
      });
    }

    // Call IDfy Async API
    const idfyResponse = await dispatchAsyncDrivingLicenseVerification({
      dlNumber: targetDl,
      dob: formattedDob,
    });

    const requestId = idfyResponse?.request_id;
    if (!requestId) {
      return res.status(502).json({
        success: false,
        message: "Failed to initiate driving license verification with IDfy.",
        rawResponse: idfyResponse,
      });
    }

    // Store in-progress record in DB
    await MerchantBusinessDoc.findOneAndUpdate(
      { merchantId },
      {
        $set: {
          drivingLicenseNumber: targetDl,
          "verificationResults.drivingLicense": {
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
      message: "Driving license verification request submitted successfully.",
      requestId,
    });
  } catch (error) {
    console.error("Async DL Request Error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to submit driving license verification request.",
      error: error.response?.data?.message || error.message,
    });
  }
};

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/**
 * Request Async GST Certificate Verification
 * POST /api/merchant/business-docs/gst/request
 */
export const requestGstVerification = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { gstin, gstNumber } = req.body;

    const cleanGstin = String(gstin || gstNumber || "")
      .replace(/[\s-]/g, "")
      .toUpperCase();

    if (!cleanGstin || !GSTIN_REGEX.test(cleanGstin)) {
      return res.status(400).json({
        success: false,
        message: "A valid 15-character GSTIN (GST identification number) is required.",
      });
    }

    const idfyResponse = await dispatchAsyncGstVerification({
      gstin: cleanGstin,
    });

    const requestId = idfyResponse?.request_id;
    if (!requestId) {
      return res.status(502).json({
        success: false,
        message: "Failed to initiate GST verification with IDfy.",
        rawResponse: idfyResponse,
      });
    }

    // Persist pending task in database
    await MerchantBusinessDoc.findOneAndUpdate(
      { merchantId },
      {
        $set: {
          gstNumber: cleanGstin,
          "verificationResults.gst": {
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
      message: "GST verification request submitted successfully.",
      requestId,
    });
  } catch (error) {
    console.error("Async GST Request Error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to submit GST verification request.",
      error: error.response?.data?.message || error.message,
    });
  }
};
import axios from "axios";
import { randomUUID } from "crypto";

const IDFY_BASE_URL = process.env.IDFY_BASE_URL || "https://eve.idfy.com/v3/tasks";
const IDFY_API_KEY = process.env.IDFY_API_KEY;
const IDFY_ACCOUNT_ID = process.env.IDFY_ACCOUNT_ID;

const idfyClient = axios.create({
  baseURL: IDFY_BASE_URL,
  headers: {
    "api-key": IDFY_API_KEY,
    "account-id": IDFY_ACCOUNT_ID,
    "Content-Type": "application/json",
  },
  timeout: 20000,
});

export const normalizeToYYYYMMDD = (dobInput) => {
  if (!dobInput) return null;
  const str = String(dobInput).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  const dmyMatch = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }
  return null;
};

// ==========================================
// 1. ASYNC TASK DISPATCHERS
// ==========================================

/**
 * Dispatches an asynchronous PAN source verification task
 */
export const dispatchAsyncPanVerification = async ({ panNumber, fullName = "", dob = "" }) => {
  const cleanPan = String(panNumber).trim().toUpperCase();
  const formattedDob = normalizeToYYYYMMDD(dob);

  const payload = {
    task_id: randomUUID(),
    group_id: randomUUID(),
    data: {
      id_number: cleanPan,
      ...(fullName && { name_to_match: fullName.trim() }),
      ...(formattedDob && { date_of_birth: formattedDob }),
    },
  };

  const response = await idfyClient.post("/async/verify_with_source/ind_pan", payload);
  return response.data; // Returns { request_id: "..." }
};

/**
 * Dispatches an asynchronous Aadhaar source verification task
 */
export const dispatchAsyncAadhaarVerification = async ({ aadhaarNumber }) => {
  const cleanAadhaar = String(aadhaarNumber).replace(/\s+/g, "");

  const payload = {
    task_id: randomUUID(),
    group_id: randomUUID(),
    data: {
      id_number: cleanAadhaar,
      consent: "yes",
    },
  };

  const response = await idfyClient.post("/async/verify_with_source/ind_aadhaar", payload);
  return response.data; // Returns { request_id: "..." }
};

// ==========================================
// 2. TASK STATUS FETCHER & PARSER
// ==========================================

/**
 * Queries the task status by request_id and parses source output
 */
export const fetchTaskStatusFromIdfy = async (requestId) => {
  const response = await idfyClient.get("", {
    params: { request_id: requestId },
  });

  const taskList = Array.isArray(response.data) ? response.data : [response.data];
  const taskDoc = taskList[0];

  if (!taskDoc) {
    return {
      status: "not_found",
      message: "No verification task found for this request ID.",
    };
  }

  // 1. Task is still processing on government gateways
  if (taskDoc.status === "in_progress") {
    return {
      status: "in_progress",
      message: "Verification is currently in progress. Please check again in a few moments.",
      rawResponse: taskDoc,
    };
  }

  const taskCompleted = taskDoc.status === "completed";
  const sourceOutput = taskDoc.result?.source_output || {};
  const taskType = taskDoc.type || taskDoc.task_type || taskDoc.action_type || taskDoc.action;

  // Safe fallback error extractor
  const rawError =
    taskDoc.result?.error?.message ||
    taskDoc.result?.error ||
    taskDoc.error?.message ||
    taskDoc.error ||
    null;

  // ==========================================
  // 1. PAN EVALUATION (ind_pan)
  // ==========================================
  if (taskType === "ind_pan") {
    const idFound = sourceOutput.status === "id_found";
    const panStatusText = sourceOutput.pan_status || "";
    const isOperative = /operative|valid|existing/i.test(panStatusText);

    const nameMatch = sourceOutput.name_match === true;
    const dobMatch = sourceOutput.dob_match === true;
    const aadhaarSeeded = sourceOutput.aadhaar_seeding_status === true;

    const isValid = taskCompleted && idFound && isOperative;

    let failureReason = null;
    if (!isValid) {
      if (!idFound) failureReason = "PAN card record not found in Income Tax registry.";
      else if (!isOperative) failureReason = `PAN status is inactive: ${panStatusText || "Invalid"}`;
      else failureReason = rawError || "PAN verification checks failed.";
    }

    return {
      type: "ind_pan",
      status: isValid ? "verified" : "failed",
      isValid,
      panNumber: sourceOutput.input_details?.input_pan_number || sourceOutput.pan_number || null,
      registeredName: sourceOutput.input_details?.input_name || null,
      panStatusText,
      nameMatch,
      dobMatch,
      aadhaarSeedingStatus: aadhaarSeeded,
      failureReason,
      rawResponse: taskDoc,
    };
  }

  // ==========================================
  // 2. AADHAAR EVALUATION (ind_aadhaar)
  // ==========================================
  if (taskType === "ind_aadhaar") {
    const idFound =
      sourceOutput.status === "id_found" ||
      sourceOutput.status === "valid" ||
      sourceOutput.status === "active";
    const isValid = taskCompleted && (idFound || sourceOutput.is_valid === true);

    return {
      type: "ind_aadhaar",
      status: isValid ? "verified" : "failed",
      isValid,
      state: sourceOutput.state || null,
      gender: sourceOutput.gender || null,
      ageBand: sourceOutput.age_band || null,
      failureReason: isValid ? null : rawError || "Aadhaar number could not be validated with source.",
      rawResponse: taskDoc,
    };
  }

  // ==========================================
  // 3. DRIVING LICENSE EVALUATION (ind_driving_license)
  // ==========================================
  if (taskType === "ind_driving_license") {
    const sourceStatus = (sourceOutput.status || "").toLowerCase();
    
    // IDfy indicates success when status is "id_found", "valid", or "active"
    const idFound =
      sourceStatus === "id_found" ||
      sourceStatus === "valid" ||
      sourceStatus === "active";

    const dlStatus = (sourceOutput.dl_status || (idFound ? "ACTIVE" : "INVALID")).toUpperCase();
    const isValid = taskCompleted && idFound;

    const vehicleClasses = Array.isArray(sourceOutput.cov_details)
      ? sourceOutput.cov_details.map((item) => item.cov).filter(Boolean)
      : [];

    return {
      type: "ind_driving_license",
      status: isValid ? "verified" : "failed",
      isValid,
      dlNumber: sourceOutput.id_number || sourceOutput.dl_number || null,
      holderName: sourceOutput.name || sourceOutput.name_on_card || null,
      dateOfBirth: sourceOutput.dob || sourceOutput.date_of_birth || null,
      fatherOrHusbandName: sourceOutput.relatives_name || sourceOutput.father_or_husband_name || null,
      dlStatus,
      issueDate: sourceOutput.date_of_issue || null,
      validFrom: sourceOutput.nt_validity_from || sourceOutput.valid_from || null,
      validUpto: sourceOutput.nt_validity_to || sourceOutput.valid_upto || null,
      vehicleClasses,
      covDetails: sourceOutput.cov_details || [],
      address: sourceOutput.address || null,
      rto: sourceOutput.issuing_rto_name || sourceOutput.rto || null,
      failureReason: isValid ? null : rawError || `Driving License status: ${sourceStatus || "not found"}`,
      rawResponse: taskDoc,
    };
  }

  // ==========================================
  // 4. FSSAI EVALUATION (ind_fssai)
  // ==========================================
  if (taskType === "ind_fssai") {
    const sourceStatus = (sourceOutput.status || "").toLowerCase();
    const licenseStatus = (sourceOutput.license_status || "").toLowerCase();

    const isLicenseActive =
      sourceStatus === "active" ||
      sourceStatus === "valid" ||
      licenseStatus === "active" ||
      licenseStatus === "valid";

    const isValid = taskCompleted && isLicenseActive;

    return {
      type: "ind_fssai",
      status: isValid ? "verified" : "failed",
      isValid,
      licenseNumber: sourceOutput.input_details?.id_number || sourceOutput.license_number || null,
      companyName: sourceOutput.company_name || sourceOutput.premises_name || sourceOutput.business_name || null,
      licenseStatus: sourceOutput.license_status || sourceOutput.status || null,
      validFrom: sourceOutput.valid_from || null,
      validUpto: sourceOutput.valid_upto || null,
      address: sourceOutput.address || sourceOutput.premises_address || null,
      failureReason: isValid ? null : rawError || `FSSAI license is ${licenseStatus || "invalid / expired"}.`,
      rawResponse: taskDoc,
    };
  }

  // ==========================================
  // FALLBACK FOR UNHANDLED TASKS
  // ==========================================
  return {
    type: taskType || "unknown",
    status: taskDoc.status || "failed",
    isValid: false,
    failureReason: rawError || `Task completed with unhandled type: ${taskType || "undefined"}`,
    rawResponse: taskDoc,
  };
};

export const dispatchAsyncFssaiVerification = async ({ fssaiNumber }) => {
  const cleanFssai = String(fssaiNumber).trim();

  const payload = {
    task_id: randomUUID(),
    group_id: randomUUID(),
    data: {
      id_number: cleanFssai,
    },
  };

  const response = await idfyClient.post("/async/verify_with_source/ind_fssai", payload);
  return response.data; // Returns { request_id: "..." }
};

export const dispatchAsyncDrivingLicenseVerification = async ({ dlNumber, dob }) => {
  const cleanDl = String(dlNumber).trim().toUpperCase();
  const formattedDob = normalizeToYYYYMMDD(dob);

  if (!formattedDob) {
    throw new Error("Valid Date of Birth (YYYY-MM-DD) is required for Driving License verification.");
  }

  const payload = {
    task_id: randomUUID(),
    group_id: randomUUID(),
    data: {
      id_number: cleanDl,
      date_of_birth: formattedDob,
      consent: "yes",
    },
  };

  const response = await idfyClient.post("/async/verify_with_source/ind_driving_license", payload);
  return response.data; // { request_id: "..." }
};
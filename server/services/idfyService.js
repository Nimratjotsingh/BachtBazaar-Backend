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

  // Task is still being processed by government registries
  if (taskDoc.status === "in_progress") {
    return {
      status: "in_progress",
      message: "Verification is currently in progress. Please check again in a few moments.",
      rawResponse: taskDoc,
    };
  }

  const taskCompleted = taskDoc.status === "completed";
  const sourceOutput = taskDoc.result?.source_output || {};

  // --- PAN Evaluation ---
  if (taskDoc.type === "ind_pan") {
    const idFound = sourceOutput.status === "id_found";
    const panStatusText = sourceOutput.pan_status || "";
    const isOperative = /operative|valid|existing/i.test(panStatusText);

    const nameMatch = sourceOutput.name_match === true;
    const dobMatch = sourceOutput.dob_match === true;
    const aadhaarSeeded = sourceOutput.aadhaar_seeding_status === true;

    const isValid = taskCompleted && idFound && isOperative;

    let failureReason = null;
    if (!isValid) {
      if (!idFound) failureReason = "PAN not found in Income Tax registry.";
      else if (!isOperative) failureReason = `PAN status is inactive: ${panStatusText}`;
      else failureReason = taskDoc.result?.error || "PAN verification checks failed.";
    }

    return {
      type: "ind_pan",
      status: isValid ? "verified" : "failed",
      isValid,
      panNumber: sourceOutput.input_details?.input_pan_number || null,
      registeredName: sourceOutput.input_details?.input_name || null,
      panStatusText,
      nameMatch,
      dobMatch,
      aadhaarSeedingStatus: aadhaarSeeded,
      failureReason,
      rawResponse: taskDoc,
    };
  }

  // --- Aadhaar Evaluation ---
  if (taskDoc.type === "ind_aadhaar") {
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
      failureReason: isValid ? null : taskDoc.result?.error || "Aadhaar number could not be validated.",
      rawResponse: taskDoc,
    };
  }

  return {
    status: taskDoc.status,
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
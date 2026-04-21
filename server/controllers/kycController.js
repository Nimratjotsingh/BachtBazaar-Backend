import axios from "axios";
import { ValidationError } from "../validators/validate.js";

const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://api.cashfree.com"
    : "https://sandbox.cashfree.com";

/**
 * FIXED: Updated helper to accept dynamic credentials.
 * If credentials aren't passed, it falls back to environment variables.
 */
const cashfreeHeaders = (clientId, clientSecret) => ({
  "Content-Type": "application/json",
  "x-client-id": clientId || process.env.CASHFREE_CLIENT_ID,
  "x-client-secret": clientSecret || process.env.CASHFREE_SECRET_KEY,
  "x-api-version": "2022-09-01" // Best practice: always include the version
});

const handleCashfreeError = (res, error, fallbackMessage) => {
  if (error instanceof ValidationError) {
    return res.status(400).json({ success: false, message: error.message });
  }
  if (error.response) {
    return res.status(error.response.status).json({
      success: false,
      ...error.response.data
    });
  }
  return res.status(500).json({ success: false, message: fallbackMessage });
};

const isCashfreeApiError = (error) => {
  const code = error?.response?.data?.code;
  return code === "api_error";
};

/**
 * FIXED: Added clientId and clientSecret as arguments
 */
const verifyPanPrimary = async (pan, name, clientId, clientSecret) => {
  return axios.post(
    `${BASE_URL}/verification/pan`,
    { pan, name },
    { headers: cashfreeHeaders(clientId, clientSecret) }
  );
};

/**
 * FIXED: Added clientId and clientSecret as arguments
 */
const verifyPanLiteFallback = async (pan, name, clientId, clientSecret) => {
  return axios.post(
    `${BASE_URL}/verification/pan-lite`,
    {
      verification_id: `ver_${Date.now()}`,
      pan,
      name
    },
    { headers: cashfreeHeaders(clientId, clientSecret) }
  );
};

// ─── PAN Verification Controller ─────────────────────────────────────────────

export const verifyPan = async (req, res) => {
  try {
    // 1. Extract Credentials from Headers (Postman)
    const clientId = req.headers['x-client-id'];
    const clientSecret = req.headers['x-client-secret'];

    // 2. Validate existence of credentials
    if (!clientId || !clientSecret) {
      return res.status(400).json({
        success: false,
        code: "x-client-id_missing",
        message: "Credentials (x-client-id or x-client-secret) are missing in request headers.",
        type: "validation_error"
      });
    }

    // 3. Extract Data from Body
    const pan = String(req.body?.pan || "").trim().toUpperCase();
    const name = String(req.body?.name || "").trim();

    if (!pan) {
      return res.status(400).json({ success: false, message: "PAN is required" });
    }

    let response;
    try {
      // 4. FIXED: Now passing the extracted headers into the helpers
      response = await verifyPanPrimary(pan, name, clientId, clientSecret);
    } catch (primaryError) {
      console.log(primaryError)
      if (isCashfreeApiError(primaryError)) {
        response = await verifyPanLiteFallback(pan, name, clientId, clientSecret);
      } else {
        throw primaryError;
      }
    }

    return res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    return handleCashfreeError(res, error, "PAN verification failed");
  }
};

// ─── Aadhaar OTP Initiation ──────────────────────────────────────────

export const initiateAadhaarOtp = async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'];
    const clientSecret = req.headers['x-client-secret'];
    const uid = String(req.body?.aadhaarNumber || "").trim();

    if (!uid || !/^\d{12}$/.test(uid)) {
      throw new ValidationError("A valid 12-digit Aadhaar number is required");
    }

    // FIXED: Passing credentials from headers
    const response = await axios.post(
      `${BASE_URL}/verification/aadhaar`,
      { uid },
      { headers: cashfreeHeaders(clientId, clientSecret) }
    );

    return res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    return handleCashfreeError(res, error, "Aadhaar OTP initiation failed");
  }
};

// ─── Aadhaar OTP Verification ────────────────────────────────────────────

export const verifyAadhaarOtp = async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'];
    const clientSecret = req.headers['x-client-secret'];
    const refId = String(req.body?.refId || "").trim();
    const otp = String(req.body?.otp || "").trim();

    if (!refId) throw new ValidationError("refId is required");
    if (!otp || !/^\d{6}$/.test(otp)) throw new ValidationError("A valid 6-digit OTP is required");

    // FIXED: Passing credentials from headers
    const response = await axios.post(
      `${BASE_URL}/verification/aadhaar/verify`,
      { ref_id: refId, otp },
      { headers: cashfreeHeaders(clientId, clientSecret) }
    );

    return res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    return handleCashfreeError(res, error, "Aadhaar OTP verification failed");
  }
};
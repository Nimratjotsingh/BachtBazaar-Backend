import axios from "axios";

// In development, use Vite proxy via same-origin '/api' to avoid browser CORS issues.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
export const DEV_OTP_BYPASS = import.meta.env.VITE_DEV_OTP_BYPASS || "123456";

export const loginConfig = {
  user: {
    endpoint: "/user/auth/login-password",
    responseKey: "user",
    createEndpoint: "/user/auth/verify-otp",
    setPasswordEndpoint: "/user/auth/set-password"
  },
  merchant: {
    endpoint: "/merchant/auth/login-password",
    responseKey: "merchant",
    createEndpoint: "/merchant/auth/verify-otp",
    setPasswordEndpoint: "/merchant/auth/set-password"
  }
};

export const accountClient = axios.create({
  baseURL: API_BASE_URL
});

export const adminClient = axios.create({
  baseURL: `${API_BASE_URL}/admin`
});

export const buildAuthHeaders = (token) => ({
  Authorization: `Bearer ${token}`
});

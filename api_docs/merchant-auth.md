# Merchant Auth APIs

Base path: `/api/merchant/auth`

## 0) Register Merchant - Step 1 (Number + Password + Send OTP)
- Method: `POST`
- Path: `/api/merchant/auth/register/send-otp`
- Auth: Not required
- Body:
```json
{
  "phone": "9876543210",
  "password": "Secret@123"
}
```
- Notes:
  - No token validation is done on this endpoint.
  - Stores password hash in pending registration state.
  - Initiates OTP verification step.
  - If merchant already registered, returns `409 Merchant already registered`.

## 0.1) Register Merchant - Step 2 (Verify OTP)
- Method: `POST`
- Path: `/api/merchant/auth/register/verify-otp`
- Body:
```json
{
  "token": "firebase_id_token"
}
```
- Notes:
  - Completes merchant creation after OTP verification.
  - Returns JWT token and merchant payload.

## 1) Send OTP
- Method: `POST`
- Path: `/api/merchant/auth/send-otp`
- Body:
```json
{
  "phone": "9876543210"
}
```

## 2) Verify OTP
- Method: `POST`
- Path: `/api/merchant/auth/verify-otp`
- Body:
```json
{
  "token": "firebase_id_token"
}
```

## 3) Set Password (Protected)
- Method: `POST`
- Path: `/api/merchant/auth/set-password`
- Auth: Bearer token required
- Body:
```json
{
  "password": "secret123"
}
```

## 4) Login with Password
- Method: `POST`
- Path: `/api/merchant/auth/login-password`
- Body:
```json
{
  "phone": "9876543210",
  "password": "secret123"
}
```

## 5) Login with OTP
- Method: `POST`
- Path: `/api/merchant/auth/login-otp`
- Body:
```json
{
  "token": "firebase_id_token"
}
```

## 6) Forgot Password
- Method: `POST`
- Path: `/api/merchant/auth/forgot-password`
- Body:
```json
{
  "token": "firebase_id_token",
  "newPassword": "newSecret123"
}
```

## 7) Update Password (Protected)
- Method: `PUT`
- Path: `/api/merchant/auth/password`
- Auth: Bearer token required
- Body:
```json
{
  "oldPassword": "oldSecret123",
  "newPassword": "newSecret123"
}
```

## Recommended Postman Sequence

1. `POST /api/merchant/auth/register/send-otp`
2. `POST /api/merchant/auth/register/verify-otp`
3. `POST /api/merchant/auth/login-password`
4. `POST /api/merchant/auth/send-otp`
5. `POST /api/merchant/auth/login-otp`

OTP note:
- `login-otp` and `verify-otp` require Firebase ID token in `token` field (not raw OTP digits).

Postman collections:
- `api_docs/postman/merchant-register-login-flow.postman_collection.json`
- `api_docs/postman/merchant-endpoints-sequence.postman_collection.json`

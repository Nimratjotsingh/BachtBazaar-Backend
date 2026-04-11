# Merchant Auth APIs

Base path: `/api/merchants`

## 3-Step Registration Flow

### Step 1) Register Send OTP (Phone Only)
- Method: `POST`
- Path: `/api/merchants/register/send-otp`
- Auth: Not required
- Body:
```json
{
  "phone": "9876543210"
}
```
- Response:
```json
{
  "success": true,
  "message": "OTP sent to your phone. Verify to continue.",
  "nextStep": "Call /api/merchants/register/verify-otp with Firebase token"
}
```
- Notes:
  - Validates phone is not already registered.
  - Returns 409 if phone already exists.

### Step 2) Register Verify OTP (OTP Verification)
- Method: `POST`
- Path: `/api/merchants/register/verify-otp`
- Auth: Not required
- Body:
```json
{
  "token": "firebase_id_token"
}
```
- Response:
```json
{
  "success": true,
  "message": "OTP verified. Please set your password.",
  "nextStep": "Call POST /api/merchants/set-password with your password",
  "token": "jwt_access_token",
  "merchant": {...}
}
```
- Notes:
  - Creates merchant account if first signup.
  - Returns JWT token for next step (password setting).

### Step 3) Set Password (Protected)
- Method: `POST`
- Path: `/api/merchants/set-password`
- Auth: Bearer token required (from Step 2)
- Body:
```json
{
  "password": "Secret@123"
}
```
- Response:
```json
{
  "success": true
}
```
- Notes:
  - Must be called immediately after Step 2 with returned JWT.
  - Password stored as bcrypt hash.

## Login Flows

### Login with Password
- Method: `POST`
- Path: `/api/merchants/login-password`
- Body:
```json
{
  "phone": "9876543210",
  "password": "secret123"
}
```
- Response:
```json
{
  "success": true,
  "token": "jwt_access_token",
  "merchant": {...}
}
```

### Login with OTP
- Method: `POST`
- Path: `/api/merchants/login-otp`
- Body:
```json
{
  "token": "firebase_id_token"
}
```
- Response:
```json
{
  "success": true,
  "token": "jwt_access_token",
  "merchant": {...}
}
```

## Password Management

### Forgot Password (OTP)
- Method: `POST`
- Path: `/api/merchants/forgot-password`
- Body:
```json
{
  "token": "firebase_id_token",
  "newPassword": "newSecret123"
}
```

### Update Password (Protected)
- Method: `PUT`
- Path: `/api/merchants/password`
- Auth: Bearer token required
- Body:
```json
{
  "oldPassword": "oldSecret123",
  "newPassword": "newSecret123"
}
```

## Testing Sequence (Postman)

**Registration (First Time):**
1. `POST /api/merchants/register/send-otp` → phone (9876543210)
2. Get Firebase OTP token via Firebase Console/SDK
3. `POST /api/merchants/register/verify-otp` → Firebase token
4. Copy JWT from response
5. `POST /api/merchants/set-password` → password (with JWT in Authorization header)

**Login (Subsequent Times):**
1. `POST /api/merchants/login-password` → phone + password
   - OR
   `POST /api/merchants/login-otp` → Firebase token

**Postman Collections:**
- `api_docs/postman/merchant-register-login-flow.postman_collection.json`

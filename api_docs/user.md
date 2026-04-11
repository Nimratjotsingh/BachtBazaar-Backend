# User Auth APIs

Base path: `/api/users`

## 3-Step Registration Flow

### Step 1) Send OTP (Phone Only)
- Method: `POST`
- Path: `/api/users/send-otp`
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
  "exists": true
}
```

### Step 2) Verify OTP (OTP Verification)
- Method: `POST`
- Path: `/api/users/verify-otp`
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
  "nextStep": "Call POST /api/users/set-password with your password",
  "token": "jwt_access_token",
  "user": {...}
}
```

### Step 3) Set Password (Protected)
- Method: `POST`
- Path: `/api/users/set-password`
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

## Login Flows

### Login with Password
- Method: `POST`
- Path: `/api/users/login`
- Body:
```json
{
  "phone": "9876543210",
  "password": "secret123"
}
```

### Login with OTP
- Method: `POST`
- Path: `/api/users/login-otp`
- Body:
```json
{
  "token": "firebase_id_token"
}
```

## Password Management

### Forgot Password (OTP)
- Method: `POST`
- Path: `/api/users/forgot-password`
- Body:
```json
{
  "token": "firebase_id_token",
  "newPassword": "newSecret123"
}
```

### Update Password (Protected)
- Method: `PUT`
- Path: `/api/users/password`
- Auth: Bearer token required
- Body:
```json
{
  "oldPassword": "oldSecret123",
  "newPassword": "newSecret123"
}
```

## User Profile

### Update Profile (Protected)
- Method: `PUT`
- Path: `/api/users/profile`
- Auth: Bearer token required
- Content-Type: `multipart/form-data`
- Fields:
  - `name` (optional)
  - `gender` (`male|female|other`, optional)
  - `address` (optional)
  - `profileImage` (image file, optional, max 5MB)

### Get Profile Image (Protected)
- Method: `GET`
- Path: `/api/users/profile-image`
- Auth: Bearer token required
- Response: raw image binary with image content type

## Testing Sequence (Postman)

**Registration (First Time):**
1. `POST /api/users/send-otp` → phone (9876543210)
2. Get Firebase OTP token via Firebase Console/SDK
3. `POST /api/users/verify-otp` → Firebase token
4. Copy JWT from response
5. `POST /api/users/set-password` → password (with JWT in Authorization header)

**Login (Subsequent Times):**
1. `POST /api/users/login` → phone + password
   - OR
   `POST /api/users/login-otp` → Firebase token

**Postman Collections:**
- `api_docs/postman/user-register-login-flow.postman_collection.json`

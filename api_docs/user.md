# User APIs

Base path: `/api/user`

## 1) Send OTP
- Method: `POST`
- Path: `/api/user/auth/send-otp`
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

## 2) Verify OTP
- Method: `POST`
- Path: `/api/user/auth/verify-otp`
- Body:
```json
{
  "token": "firebase_id_token"
}
```

## 3) Set Password (Protected)
- Method: `POST`
- Path: `/api/user/auth/set-password`
- Auth: Bearer token required
- Body:
```json
{
  "password": "secret123"
}
```

## 4) Login with Password
- Method: `POST`
- Path: `/api/user/auth/login-password`
- Body:
```json
{
  "phone": "9876543210",
  "password": "secret123"
}
```

## 5) Login with OTP
- Method: `POST`
- Path: `/api/user/auth/login-otp`
- Body:
```json
{
  "token": "firebase_id_token"
}
```

## 6) Forgot Password
- Method: `POST`
- Path: `/api/user/auth/forgot-password`
- Body:
```json
{
  "token": "firebase_id_token",
  "newPassword": "newSecret123"
}
```

## 7) Update Profile (Protected)
- Method: `PUT`
- Path: `/api/user/profile`
- Auth: Bearer token required
- Content-Type: `multipart/form-data`
- Fields:
  - `name` (optional)
  - `gender` (`male|female|other`, optional)
  - `address` (optional)
  - `profileImage` (image file, optional, max 5MB)

## 8) Update Password (Protected)
- Method: `PUT`
- Path: `/api/user/password`
- Auth: Bearer token required
- Body:
```json
{
  "oldPassword": "oldSecret123",
  "newPassword": "newSecret123"
}
```

## 9) Get Profile Image (Protected)
- Method: `GET`
- Path: `/api/user/profile-image`
- Auth: Bearer token required
- Response: raw image binary with image content type

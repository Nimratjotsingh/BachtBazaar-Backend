# Merchant Auth APIs

Base path: `/api/merchant/auth`

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

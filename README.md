# BBackend API Documentation

## Documentation Hub

The API docs are now maintained in modular files under `api_docs`.

- Main index: [api_docs/README.md](api_docs/README.md)
- Conventions: [api_docs/conventions.md](api_docs/conventions.md)
- User APIs: [api_docs/user.md](api_docs/user.md)
- Merchant Auth APIs: [api_docs/merchant-auth.md](api_docs/merchant-auth.md)
- Merchant Profile APIs: [api_docs/merchant-profile.md](api_docs/merchant-profile.md)
- Merchant Personal Docs APIs: [api_docs/merchant-personal-docs.md](api_docs/merchant-personal-docs.md)
- Merchant Business Docs APIs: [api_docs/merchant-business-docs.md](api_docs/merchant-business-docs.md)
- Merchant Shop APIs: [api_docs/merchant-shop.md](api_docs/merchant-shop.md)
- Category APIs: [api_docs/categories.md](api_docs/categories.md)

## Legacy Notes

The rest of this README contains older inline documentation. Prefer the files in `api_docs` for the latest routes and payloads.

---
## User Endpoints

## Authentication Endpoints

### 1. Send OTP
**Endpoint:** `POST /auth/send-otp`

**Description:** Check if a user exists and initiate OTP sending process.

**Request Body:**
```json
{
  "phone": "9876543210"
}
```

**Request Parameters:**
- `phone` (string, required): 10-digit phone number

**Response:**
```json
{
  "success": true,
  "exists": true
}
```



---

### 2. Verify OTP
**Endpoint:** `POST /auth/verify-otp`

**Description:** Verify Firebase OTP token and authenticate user. Creates a new user if they don't exist.

**Request Body:**
```json
{
  "token": "firebase_id_token"
}
```

**Request Parameters:**
- `token` (string, required): Firebase ID token from client

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "_id": "user_id",
    "phone": "9876543210",
    "isVerified": true,
    "createdAt": "2026-04-01T10:00:00Z",
    "updatedAt": "2026-04-01T10:00:00Z"
  }
}
```



---

### 3. Set Password
**Endpoint:** `POST /auth/set-password`

**Description:** Set or update user password during signup completion.

**Request Body:**
```json
{
  "userId": "user_id",
  "password": "securePassword123"
}
```

**Request Parameters:**
- `userId` (string, required): User ID from database
- `password` (string, required): Password (minimum 6 characters)

**Response:**
```json
{
  "success": true
}
```



---

### 4. Login with Password
**Endpoint:** `POST /auth/login-password`

**Description:** Authenticate user with phone number and password.

**Request Body:**
```json
{
  "phone": "9876543210",
  "password": "securePassword123"
}
```

**Request Parameters:**
- `phone` (string, required): 10-digit phone number
- `password` (string, required): Password (minimum 6 characters)

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "_id": "user_id",
    "phone": "9876543210",
    "name": "John Doe",
    "gender": "male",
    "address": "123 Main St",
    "profileImage": "/uploads/profile.jpg",
    "isVerified": true,
    "createdAt": "2026-04-01T10:00:00Z",
    "updatedAt": "2026-04-01T10:00:00Z"
  }
}
```



---

### 5. Login with OTP
**Endpoint:** `POST /auth/login-otp`

**Description:** Authenticate existing user with Firebase OTP token.

**Request Body:**
```json
{
  "token": "firebase_id_token"
}
```

**Request Parameters:**
- `token` (string, required): Firebase ID token from client

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "_id": "user_id",
    "phone": "9876543210",
    "name": "John Doe",
    "gender": "male",
    "address": "123 Main St",
    "profileImage": "/uploads/profile.jpg",
    "isVerified": true,
    "createdAt": "2026-04-01T10:00:00Z",
    "updatedAt": "2026-04-01T10:00:00Z"
  }
}
```



---



### 6. Update Profile
**Endpoint:** `PUT /update-profile`

**Description:** Update user profile information including name, gender, address, and profile image. Requires authentication.

**Authentication:** Required (JWT token in Authorization header)

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body (Form Data):**
```
name: "John Doe" (optional)
gender: "male" (optional) - enum: "male", "female", "other"
address: "123 Main St" (optional) - minimum 3 characters
profileImage: <file> (optional) - image file
```

**Response:**
```json
{
  "success": true,
  "user": {
    "_id": "user_id",
    "phone": "9876543210",
    "name": "John Doe",
    "gender": "male",
    "address": "123 Main St",
    "profileImage": "/uploads/profile.jpg",
    "isVerified": true,
    "createdAt": "2026-04-01T10:00:00Z",
    "updatedAt": "2026-04-01T10:00:00Z"
  }
}
```



---
## Merchant Endpoints

### 1. Send OTP
**Endpoint:** `POST /auth/send-otp`

**Description:** Verify merchant existence and initiate OTP flow.

**Request Body:**
```json
{
  "phone": "9876543210"
}
```

**Response:**
```json
{
  "success": true,
  "exists": true
}
```


---

### 2. Verify OTP
**Endpoint:** `POST /auth/verify-otp`

**Description:** Validate Firebase OTP and issue JWT; create merchant if not exists.

**Request Body:**
```json
{
  "token": "firebase_id_token"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "merchant": {
    "_id": "merchant_id",
    "phone": "9876543210",
    "isVerified": true
  }
}
```



---

### 3. Set Password
**Endpoint:** `POST /auth/set-password`

**Description:** Set password after OTP verification.

**Request Body:**
```json
{
  "merchantId": "merchant_id",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true
}
```



---

### 4. Login with Password
**Endpoint:** `POST /auth/login-password`

**Description:** Validate merchant using phone and password.

**Request Body:**
```json
{
  "phone": "9876543210",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "merchant": { /* merchant data */ }
}
```



---

### 5. Login with OTP
**Endpoint:** `POST /auth/login-otp`

**Description:** Login merchant via Firebase OTP.

**Request Body:**
```json
{
  "token": "firebase_id_token"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "merchant": { /* merchant data */ }
}
```



---

### 6. Update Merchant Profile
**Endpoint:** `PUT /update-profile`
**Authentication:** Required (JWT token in Authorization header)

**Request Body (form-data):**
`name`, `gender`, `city`, `phone`, `email` (optional), `profileImage` (file)

**Response:**
```json
{
  "success": true,
  "merchant": { /* updated merchant */ }
}
```



---

### 7. Upload Personal Documents
**Endpoint:** `POST /upload-documents`
**Authentication:** Required (JWT token in Authorization header)

**Request Body (form-data):**
fields: `aadharNumber`, `aadharImage` (file),  or `panNumber`, `name`, `dob `, `panImage` (file)

**Notes:** Either Aadhar or PAN info required; each number requires corresponding image.

**Response:**
```json
{
  "success": true,
  "message": "Documents uploaded successfully",
  "personalDocs": { /* docs */ },
  "kycStatus": "verified"
}
```
### 8. verify Pan With Cashfree
**Endpoint:** `POST https://sandbox.cashfree.com/verification/pan-lite`

**Response**
````json
{
  "verification_id": "ver_171223344",
  "pan": "ABCDE1234F",
  "name": "John Doe",
  "dob": "1995-05-20"
}

{
  "status": "VALID",
  "name_match": "Y",
  "name": "JOHN DOE"
}

````headers
{
  "x-client-id": "YOUR_CLIENT_ID",
  "x-client-secret": "YOUR_SECRET_KEY",
  "Content-Type": "application/json"
}
---

### 9. Upload Business Documents
**Endpoint:** `POST /upload-business-documents`
**Authentication:** Required (JWT token in Authorization header)

**Request Body (form-data):**
fields: `gstNumber`, `tradeLicenseNumber`, `shopRegistrationNumber`, `fssaiNumber` plus corresponding image files.

**Response:**
```json
{
  "success": true,
  "message": "Business documents uploaded successfully",
  "businessDocs": { /* docs */ }
}
```



---

### 10. Update Shop Profile
**Endpoint:** `POST /update-shop-profile`
**Authentication:** Required (JWT token in Authorization header)

**Request Body (form-data):**
fields: `shopName`, `category`, `subCategory`, `address`, `city`, `description`, `phone`, `openingHours` (JSON string), `logoImage` (file), `shopBannerImage` (file)

**Response:**
```json
{
  "success": true,
  "shop": { /* updated shop object */ }
}
```







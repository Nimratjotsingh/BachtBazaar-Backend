# Firebase & OTP Testing

This folder contains test files for Firebase integration and OTP flow verification.

## Test Files

### 1. `firebase.test.js` - Firebase Admin SDK Tests

Comprehensive test suite covering:
- ✓ Firebase Admin SDK initialization
- ✓ Create test user with phone number
- ✓ Generate custom tokens
- ✓ Verify ID tokens
- ✓ Get user by phone number
- ✓ Set custom claims (for RBAC)
- ✓ Token payload inspection

**Run the test:**
```bash
node test/firebase.test.js
```

Or add to package.json scripts:
```json
"test:firebase": "node test/firebase.test.js"
```

**What it tests:**
- Firebase initialization with your credentials
- User creation with phone numbers
- Custom token generation
- ID token verification
- Custom claims for role-based access control
- Token payload decoding

### 2. `otp-flow.test.js` - OTP Verification Flow

Tests the complete 3-step signup flow:
- ✓ User creation with phone
- ✓ OTP verification simulation (Firebase)
- ✓ ID token generation
- ✓ ID token verification
- ✓ Phone validation

**Run the test:**
```bash
node test/otp-flow.test.js
```

**Flow simulated:**
1. User provides phone → Create Firebase user
2. Firebase sends OTP (SMS) → User enters code
3. Firebase verifies OTP → Returns ID token
4. Backend verifies ID token → Create/update MongoDB record
5. Generate JWT with role/accountType
6. Return JWT to frontend
7. Frontend uses JWT for set-password endpoint

## Prerequisites

Ensure `.env` file has:
```
FIREBASE_PROJECT_ID=bachatbazaar-17716
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@bachatbazaar-17716.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Expected Output

### Firebase Test Output:
```
=== Firebase Admin SDK Test Suite ===

📋 Test 1: Firebase Admin Initialization
✓ Firebase Admin SDK initialized successfully
  Project ID: bachatbazaar-17716

📋 Test 2: Create Test User with Phone
✓ Test user created successfully
  UID: test-user-123
  Phone: +919876543210
  Created: 2024-04-11T10:30:00.000Z

📋 Test 3: Generate Custom Token
✓ Custom token generated successfully
  Token (first 50 chars): eyJhbGciOiJSUzI1NiIsInR5cCI6Ikp...
  Token length: 1024

📋 Test 4: Verify ID Token
✓ ID token verified successfully
  UID: test-user-123
  Email: N/A
  Phone: +919876543210
  Issued at: 2024-04-11T10:30:00.000Z
  Expires at: 2024-04-11T11:30:00.000Z

...

✅ All Firebase tests completed successfully!
```

### OTP Flow Output:
```
=== Firebase OTP Verification Test ===

📱 Step 1: Create test user with phone number
   Phone: +919876543210
✓ User created with UID: abc123def456

📱 Step 2: Simulate OTP Verification
   (In real app, Firebase sends OTP to phone via SMS)
   (User enters OTP in frontend, Firebase verifies it)
   (Firebase returns ID token if OTP is correct)
✓ ID Token generated (simulating OTP verification)

🔐 Step 3: Backend Verifies ID Token
✓ ID Token verified successfully
  UID: abc123def456
  Phone: +919876543210

💾 Step 4: Create Account in MongoDB
  - Store: { phone: "+919876543210", isVerified: true }
  - Generate JWT: { id, role, accountType }
  - Return JWT to frontend

✅ OTP Flow Test Completed Successfully!
```

## Firebase Phone Number Format

Backend expects: `+91` prefix
- Input: `9876543210` → Formatted: `+919876543210` ✓
- Input: `+919876543210` → Already formatted: `+919876543210` ✓
- Input: `919876543210` → Needs formatting: `+919876543210` ✓

## Token Verification in Backend

Example usage in controllers:
```javascript
try {
  const decoded = await admin.auth().verifyIdToken(token);
  const phone = formatPhone(decoded.phone_number);
  
  let user = await User.findOne({ phone });
  if (!user) {
    user = await User.create({ phone, isVerified: true });
  }
  
  const jwtToken = generateToken(user._id, {
    role: user.role || ROLES.USER,
    accountType: ACCOUNT_TYPES.USER
  });
  
  res.json({ success: true, token: jwtToken, user });
} catch (error) {
  res.status(401).json({ message: "Invalid OTP" });
}
```

## Troubleshooting

### "Firebase Admin SDK not initialized"
- Check `.env` file exists
- Verify `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- Ensure `npm install` was run

### "Invalid token format"
- Token might be expired
- Firebase credentials might be invalid
- Check Firebase project is active

### "User not found"
- Phone number format mismatch
- Double-check phone number exists in Firebase

### "Permission denied"
- Firebase project permissions insufficient
- Check Firebase Admin credentials
- Verify service account has auth permissions

## Integration with Controllers

The tests verify that these controller methods work:
- `userController.verifyOtp()` - Verify user OTP
- `merchantAuthController.registerMerchantVerifyOtp()` - Verify merchant OTP
- `authMiddleware.protectUser()` - Protected endpoint auth
- `authMiddleware.protectMerchant()` - Protected endpoint auth

## Next Steps

After tests pass:
1. ✓ Firebase integration working
2. ✓ OTP flow verified
3. → Test APIs in Postman collections:
   - `api_docs/postman/user-register-login-flow.postman_collection.json`
   - `api_docs/postman/merchant-register-login-flow.postman_collection.json`

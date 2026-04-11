# Firebase Test Files - Quick Reference

## 📚 Test Files Created

### 1. `test/firebase.test.js` - Firebase Admin SDK Tests
**What:** Tests Firebase initialization and admin operations
**When:** Before any signup/login features
**Run:** `node test/firebase.test.js`

Tests:
- Firebase SDK initialization with `.env` credentials
- Create users with phone numbers
- Generate custom tokens
- Verify ID tokens
- Get user by phone
- Set custom claims (for RBAC)
- Delete users (cleanup)

**Expected Time:** ~5 seconds

---

### 2. `test/otp-flow.test.js` - OTP Flow Simulation
**What:** Simulates how OTP flow works in Firebase
**When:** After firebase.test.js passes
**Run:** `node test/otp-flow.test.js`

Tests:
- User creation with phone
- OTP verification simulation
- Firebase token generation
- Backend token verification
- Phone validation

**Shows:** Step-by-step what happens when user signs up with OTP

**Expected Time:** ~5 seconds

---

### 3. `test/integration.test.js` - End-to-End API Tests
**What:** Tests actual API endpoints with database
**When:** After running server with `npm run dev`
**Requirements:**
- Server running: `npm run dev`
- MongoDB running
- `.env` configured

**Run in Terminal 2:**
```bash
node test/integration.test.js
```

Tests **User Signup:**
1. POST /api/users/send-otp → {phone}
2. POST /api/users/verify-otp → {firebase_token}
3. POST /api/users/set-password → {password}
4. POST /api/users/login → {phone, password}

Tests **Merchant Signup:**
1. POST /api/merchants/register/send-otp → {phone}
2. POST /api/merchants/register/verify-otp → {firebase_token}
3. POST /api/merchants/set-password → {password}
4. POST /api/merchants/login-password → {phone, password}

**Expected Time:** ~10 seconds

---

## 🚀 Quick Start

### Step 1: Verify Firebase Credentials
```bash
node test/firebase.test.js
```

✓ Output: `All Firebase tests completed successfully!`

### Step 2: Understand OTP Flow
```bash
node test/otp-flow.test.js
```

✓ Output: `OTP Flow Test Completed Successfully!`

### Step 3: Test Full API (with running server)
```bash
# Terminal 1
npm run dev

# Terminal 2
node test/integration.test.js
```

✓ Output:
```
Integration Test Summary:
  User 3-Step Flow: ✅ PASS
  Merchant 3-Step Flow: ✅ PASS
```

---

## 📋 Test Outputs

### Firebase Test Output
```
=== Firebase Admin SDK Test Suite ===

📋 Test 1: Firebase Admin Initialization
✓ Firebase Admin SDK initialized successfully
  Project ID: bachatbazaar-17716

📋 Test 2: Create Test User with Phone
✓ Test user created successfully
  UID: test-user-123
  Phone: +919876543210

📋 Test 3: Generate Custom Token
✓ Custom token generated successfully

📋 Test 4: Verify ID Token
✓ ID token verified successfully
  UID: test-user-123
  Phone: +919876543210

...

✅ All Firebase tests completed successfully!
```

### Integration Test Output
```
=== Integration Test: 3-Step Signup Flow ===

👤 User 3-Step Signup Flow

1️⃣  POST /api/users/send-otp (Phone only)
   ✓ Status: 200
   Response: OTP sent to your phone...

2️⃣  POST /api/users/verify-otp (Firebase Token)
   Generated Firebase token for UID: abc123
   ✓ Status: 201
   Response: OTP verified. Please set your password.

3️⃣  POST /api/users/set-password (Protected - needs JWT)
   ✓ Status: 200
   Response: {"success":true}

4️⃣  POST /api/users/login (Password Login)
   ✓ Status: 200
   JWT Token: eyJhbGciOiJSUzI1NiIs...

✅ User signup flow completed successfully!

🏪 Merchant 3-Step Signup Flow

1️⃣  POST /api/merchants/register/send-otp (Phone only)
   ✓ Status: 200

...

Integration Test Summary:
  User 3-Step Flow: ✅ PASS
  Merchant 3-Step Flow: ✅ PASS
```

---

## 🔧 Troubleshooting

### Firebase Test Fails: "Firebase not initialized"
**Solution:** Check `.env` file
```env
FIREBASE_PROJECT_ID=bachatbazaar-17716
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@bachatbazaar-17716.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Integration Test Fails: "Cannot connect to server"
**Solution:** Run server first
```bash
npm run dev  # Terminal 1
# Wait 2-3 seconds for server to start, then run integration test in Terminal 2
```

### Integration Test Fails: "User not found"
**Solution:** Ensure MongoDB is running and connected
```bash
# Check MongoDB connection in server logs
npm run dev
```

### Error: "Invalid token format"
**Solution:** Firebase token generation failed
- Check Firebase credentials are valid
- Check project exists and is active
- Verify phone number format: 10 digits (9876543210)

---

## 📊 Testing Sequence

```
├── firebase.test.js ─────────────────┐
│                                     │
├── otp-flow.test.js ─────────────────┤
│                                     │
└─ integration.test.js ────────────────┘
   (needs npm run dev)
```

**Estimated Total Time:** ~20 seconds

---

## ✅ What to Do After Tests Pass

### 1. Test with Postman
- Import: `api_docs/postman/user-register-login-flow.postman_collection.json`
- Import: `api_docs/postman/merchant-register-login-flow.postman_collection.json`
- Follow the sequence in each collection

### 2. Test with Frontend
- Your frontend should use Firebase SDK to:
  1. Send OTP (Firebase)
  2. Verify OTP (Firebase)
  3. Send Firebase token to backend
  4. Backend returns JWT
  5. Use JWT for password setting

### 3. Test Admin Features
- Use RBAC Postman collection to test:
  - Bootstrap super-admin
  - Assign roles
  - Test protected endpoints

---

## 🔐 Security Notes

### Test Data
- Default phone: `9876543210`
- Default password: `TestPass@123`
- Test database: Uses actual MongoDB (be careful!)

### Production
- Never commit Firebase private keys
- Always use `.env` for secrets
- Rotate bootstrap admin secret after first use
- Use strong passwords for testing

---

## 📝 Adding Custom Tests

To add more tests, create `test/custom-test.js`:
```javascript
import admin from "../config/firebase.js";
import dotenv from "dotenv";

dotenv.config();

async function customTest() {
  console.log("Running custom test...");
  // Your test code
  await admin.auth().getUserByPhoneNumber("+919876543210");
  console.log("✓ Test passed");
}

customTest().catch(console.error);
```

Run: `node test/custom-test.js`

---

## 📞 Firebase Resources

- [Firebase Admin SDK Docs](https://firebase.google.com/docs/reference/admin)
- [Phone Authentication](https://firebase.google.com/docs/auth/admin/manage-users#create_a_user)
- [Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims)
- [OTP Flow](https://firebase.google.com/docs/phone-auth)

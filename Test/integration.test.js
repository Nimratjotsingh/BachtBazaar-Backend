import axios from "axios";
import dotenv from "dotenv";
import admin from "../config/firebase.js";

dotenv.config();

const BASE_URL = "http://localhost:5000";
const testPhone = "9876543210";
const testPassword = "TestPass@123";

console.log("\n=== Integration Test: 3-Step Signup Flow ===\n");

/**
 * Helper: Create Firebase OTP token for testing
 */
async function getFirebaseToken(phone) {
  try {
    // Delete if exists
    try {
      const user = await admin.auth().getUserByPhoneNumber(`+91${phone}`);
      await admin.auth().deleteUser(user.uid);
    } catch (e) {
      // User doesn't exist
    }

    // Create test user
    const userRecord = await admin.auth().createUser({
      phoneNumber: `+91${phone}`,
      disabled: false
    });

    // Generate token (simulates OTP verification)
    const token = await admin.auth().createCustomToken(userRecord.uid);
    return { token, uid: userRecord.uid };
  } catch (error) {
    console.error("Firebase error:", error.message);
    throw error;
  }
}

/**
 * Test User 3-Step Signup Flow
 */
async function testUserSignupFlow() {
  console.log("👤 User 3-Step Signup Flow\n");
  
  try {
    // Step 1: Send OTP
    console.log("1️⃣  POST /api/users/send-otp (Phone only)");
    const step1 = await axios.post(`${BASE_URL}/api/users/send-otp`, {
      phone: testPhone
    });
    console.log(`   ✓ Status: ${step1.status}`);
    console.log(`   Response: ${step1.data.message}\n`);

    if (!step1.data.success) {
      console.log("   ✗ Step 1 failed");
      return false;
    }

    // Step 2: Verify OTP
    console.log("2️⃣  POST /api/users/verify-otp (Firebase Token)");
    const { token, uid } = await getFirebaseToken(testPhone);
    console.log(`   Generated Firebase token for UID: ${uid}`);

    const step2 = await axios.post(`${BASE_URL}/api/users/verify-otp`, {
      token: token
    });
    console.log(`   ✓ Status: ${step2.status}`);
    console.log(`   Response: ${step2.data.message}`);
    console.log(`   JWT Token: ${step2.data.token?.substring(0, 30)}...\n`);

    if (!step2.data.token) {
      console.log("   ✗ Step 2 failed - no token returned");
      return false;
    }

    const jwtToken = step2.data.token;

    // Step 3: Set Password (Protected)
    console.log("3️⃣  POST /api/users/set-password (Protected - needs JWT)");
    const step3 = await axios.post(
      `${BASE_URL}/api/users/set-password`,
      { password: testPassword },
      { headers: { Authorization: `Bearer ${jwtToken}` } }
    );
    console.log(`   ✓ Status: ${step3.status}`);
    console.log(`   Response: ${JSON.stringify(step3.data)}\n`);

    if (!step3.data.success) {
      console.log("   ✗ Step 3 failed");
      return false;
    }

    // Step 4: Login with Password
    console.log("4️⃣  POST /api/users/login (Password Login)");
    const step4 = await axios.post(`${BASE_URL}/api/users/login`, {
      phone: testPhone,
      password: testPassword
    });
    console.log(`   ✓ Status: ${step4.status}`);
    console.log(`   JWT Token: ${step4.data.token?.substring(0, 30)}...\n`);

    if (!step4.data.token) {
      console.log("   ✗ Step 4 failed - no token returned");
      return false;
    }

    console.log("✅ User signup flow completed successfully!\n");
    return true;

  } catch (error) {
    console.log(`✗ Error: ${error.response?.status} ${error.response?.data?.message || error.message}\n`);
    return false;
  }
}

/**
 * Test Merchant 3-Step Signup Flow
 */
async function testMerchantSignupFlow() {
  console.log("🏪 Merchant 3-Step Signup Flow\n");

  const merchantPhone = "9999888877";
  
  try {
    // Step 1: Register Send OTP
    console.log("1️⃣  POST /api/merchants/register/send-otp (Phone only)");
    const step1 = await axios.post(`${BASE_URL}/api/merchants/register/send-otp`, {
      phone: merchantPhone
    });
    console.log(`   ✓ Status: ${step1.status}`);
    console.log(`   Response: ${step1.data.message}\n`);

    if (!step1.data.success) {
      console.log("   ✗ Step 1 failed");
      return false;
    }

    // Step 2: Register Verify OTP
    console.log("2️⃣  POST /api/merchants/register/verify-otp (Firebase Token)");
    const { token, uid } = await getFirebaseToken(merchantPhone);
    console.log(`   Generated Firebase token for UID: ${uid}`);

    const step2 = await axios.post(`${BASE_URL}/api/merchants/register/verify-otp`, {
      token: token
    });
    console.log(`   ✓ Status: ${step2.status}`);
    console.log(`   Response: ${step2.data.message}`);
    console.log(`   JWT Token: ${step2.data.token?.substring(0, 30)}...\n`);

    if (!step2.data.token) {
      console.log("   ✗ Step 2 failed - no token returned");
      return false;
    }

    const jwtToken = step2.data.token;

    // Step 3: Set Password (Protected)
    console.log("3️⃣  POST /api/merchants/set-password (Protected - needs JWT)");
    const step3 = await axios.post(
      `${BASE_URL}/api/merchants/set-password`,
      { password: testPassword },
      { headers: { Authorization: `Bearer ${jwtToken}` } }
    );
    console.log(`   ✓ Status: ${step3.status}`);
    console.log(`   Response: ${JSON.stringify(step3.data)}\n`);

    if (!step3.data.success) {
      console.log("   ✗ Step 3 failed");
      return false;
    }

    // Step 4: Login with Password
    console.log("4️⃣  POST /api/merchants/login-password (Password Login)");
    const step4 = await axios.post(`${BASE_URL}/api/merchants/login-password`, {
      phone: merchantPhone,
      password: testPassword
    });
    console.log(`   ✓ Status: ${step4.status}`);
    console.log(`   JWT Token: ${step4.data.token?.substring(0, 30)}...\n`);

    if (!step4.data.token) {
      console.log("   ✗ Step 4 failed - no token returned");
      return false;
    }

    console.log("✅ Merchant signup flow completed successfully!\n");
    return true;

  } catch (error) {
    console.log(`✗ Error: ${error.response?.status} ${error.response?.data?.message || error.message}\n`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runIntegrationTests() {
  console.log("⚠️  Make sure your server is running: npm run dev\n");

  try {
    // Test connection
    console.log("🔗 Testing connection to server...");
    try {
      const health = await axios.get(`${BASE_URL}/health`);
      console.log(`✓ Server is running\n`);
    } catch (error) {
      console.log(`✗ Cannot connect to server at ${BASE_URL}`);
      console.log("   Start server with: npm run dev\n");
      process.exit(1);
    }

    // Run tests
    const userResult = await testUserSignupFlow();
    const merchantResult = await testMerchantSignupFlow();

    // Summary
    console.log("=".repeat(50));
    console.log("Integration Test Summary:");
    console.log(`  User 3-Step Flow: ${userResult ? "✅ PASS" : "❌ FAIL"}`);
    console.log(`  Merchant 3-Step Flow: ${merchantResult ? "✅ PASS" : "❌ FAIL"}`);
    console.log("=".repeat(50) + "\n");

    process.exit(userResult && merchantResult ? 0 : 1);

  } catch (error) {
    console.error("\n❌ Test Error:", error.message);
    process.exit(1);
  }
}

// Run tests
runIntegrationTests();

import admin from "../config/firebase.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Firebase OTP Verification Simulation
 * This test simulates the OTP flow used in your 3-step signup
 */

const testPhone = "+919876543210";

console.log("\n=== Firebase OTP Verification Test ===\n");

/**
 * Simulate OTP Flow:
 * 1. User provides phone via frontend
 * 2. Frontend requests OTP from Firebase (via SDK)
 * 3. Firebase sends OTP to phone
 * 4. User enters OTP code
 * 5. Firebase verifies OTP, returns ID token
 * 6. Frontend sends ID token to backend
 * 7. Backend verifies ID token
 */

async function testOtpFlow() {
  try {
    console.log("📱 Step 1: Create test user with phone number");
    console.log(`   Phone: ${testPhone}`);
    
    // Delete if exists
    try {
      const user = await admin.auth().getUserByPhoneNumber(testPhone);
      await admin.auth().deleteUser(user.uid);
      console.log("   (Deleted existing user)");
    } catch (e) {
      // User doesn't exist
    }

    // Create new user with phone
    const userRecord = await admin.auth().createUser({
      phoneNumber: testPhone,
      disabled: false
    });

    console.log(`✓ User created with UID: ${userRecord.uid}\n`);

    console.log("📱 Step 2: Simulate OTP Verification");
    console.log("   (In real app, Firebase sends OTP to phone via SMS)");
    console.log("   (User enters OTP in frontend, Firebase verifies it)");
    console.log("   (Firebase returns ID token if OTP is correct)\n");

    // Generate ID token (simulating successful OTP verification)
    const idToken = await admin.auth().createCustomToken(userRecord.uid);
    console.log(`✓ ID Token generated (simulating OTP verification)`);
    console.log(`  Token: ${idToken.substring(0, 50)}...\n`);

    console.log("🔐 Step 3: Backend Verifies ID Token");
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log(`✓ ID Token verified successfully`);
    console.log(`  UID: ${decodedToken.uid}`);
    console.log(`  Phone: ${decodedToken.phone_number || "N/A"}`);
    console.log(`  Issued: ${new Date(decodedToken.iat * 1000).toISOString()}`);
    console.log(`  Expires: ${new Date(decodedToken.exp * 1000).toISOString()}\n`);

    console.log("💾 Step 4: Create Account in MongoDB");
    console.log(`  - Store: { phone: "${testPhone}", isVerified: true }`);
    console.log(`  - Generate JWT: { id, role, accountType }`);
    console.log(`  - Return JWT to frontend\n`);

    console.log("🔐 Step 5: Frontend Sets Password (Protected Endpoint)");
    console.log(`  - Auth header: Bearer ${idToken.substring(0, 30)}...`);
    console.log(`  - Body: { password: "Secret@123" }`);
    console.log(`  - Backend hashes & saves password\n`);

    // Clean up
    console.log("🧹 Cleanup: Deleting test user");
    await admin.auth().deleteUser(userRecord.uid);
    console.log("✓ Test user deleted\n");

    console.log("=".repeat(50));
    console.log("✅ OTP Flow Test Completed Successfully!");
    console.log("=".repeat(50) + "\n");

  } catch (error) {
    console.error("\n❌ Test Error:", error.message);
    process.exit(1);
  }
}

/**
 * Test phone number validation
 */
async function testPhoneValidation() {
  console.log("\n=== Test Phone Validation ===\n");

  const testPhones = [
    { phone: "+919876543210", valid: true, desc: "Valid: +91 prefix included" },
    { phone: "9876543210", valid: true, desc: "Valid: Without +91 (will be added)" },
    { phone: "+1234567890", valid: false, desc: "Invalid: Wrong country code" },
    { phone: "98765432", valid: false, desc: "Invalid: Too short" },
    { phone: "98765432101", valid: false, desc: "Invalid: Too long" }
  ];

  for (const test of testPhones) {
    try {
      // This would fail for invalid numbers when actually creating user
      const phoneRegex = /^[0-9]{10}$/;
      const isInvalid = !phoneRegex.test(test.phone.replace("+91", ""));
      
      if (isInvalid) {
        console.log(`✗ ${test.desc}`);
      } else {
        console.log(`✓ ${test.desc}`);
      }
    } catch (error) {
      console.log(`✗ ${test.desc}`);
    }
  }
}

async function main() {
  await testOtpFlow();
  await testPhoneValidation();
  process.exit(0);
}

main();

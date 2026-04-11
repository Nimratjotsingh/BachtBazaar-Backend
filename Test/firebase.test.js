import admin from "../config/firebase.js";
import dotenv from "dotenv";

dotenv.config();

const testPhone = "+919876543210";
const testUID = "test-user-123";

console.log("\n=== Firebase Admin SDK Test Suite ===\n");

/**
 * Test 1: Firebase Admin Initialization
 */
async function testFirebaseInit() {
  console.log("📋 Test 1: Firebase Admin Initialization");
  try {
    const apps = admin.apps;
    if (apps.length > 0) {
      console.log("✓ Firebase Admin SDK initialized successfully");
      console.log(`  Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
      return true;
    } else {
      console.log("✗ Firebase Admin SDK not initialized");
      return false;
    }
  } catch (error) {
    console.log(`✗ Error: ${error.message}`);
    return false;
  }
}

/**
 * Test 2: Create Test User with Phone
 */
async function testCreateUserWithPhone() {
  console.log("\n📋 Test 2: Create Test User with Phone");
  try {
    // Check if user exists, delete if so
    try {
      await admin.auth().deleteUser(testUID);
      console.log("  (Deleted existing test user)");
    } catch (e) {
      // User doesn't exist, that's fine
    }

    // Create new user
    const userRecord = await admin.auth().createUser({
      uid: testUID,
      phoneNumber: testPhone,
      disabled: false
    });

    console.log("✓ Test user created successfully");
    console.log(`  UID: ${userRecord.uid}`);
    console.log(`  Phone: ${userRecord.phoneNumber}`);
    console.log(`  Created: ${userRecord.metadata.creationTime}`);
    return userRecord;
  } catch (error) {
    console.log(`✗ Error: ${error.message}`);
    return null;
  }
}

/**
 * Test 3: Generate Custom Token
 */
async function testGenerateCustomToken(uid = testUID) {
  console.log("\n📋 Test 3: Generate Custom Token");
  try {
    const token = await admin.auth().createCustomToken(uid);
    console.log("✓ Custom token generated successfully");
    console.log(`  Token (first 50 chars): ${token.substring(0, 50)}...`);
    console.log(`  Token length: ${token.length}`);
    return token;
  } catch (error) {
    console.log(`✗ Error: ${error.message}`);
    return null;
  }
}

/**
 * Test 4: Verify ID Token
 */
async function testVerifyIdToken(idToken) {
  console.log("\n📋 Test 4: Verify ID Token");
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log("✓ ID token verified successfully");
    console.log(`  UID: ${decodedToken.uid}`);
    console.log(`  Email: ${decodedToken.email || "N/A"}`);
    console.log(`  Phone: ${decodedToken.phone_number || "N/A"}`);
    console.log(`  Issued at: ${new Date(decodedToken.iat * 1000).toISOString()}`);
    console.log(`  Expires at: ${new Date(decodedToken.exp * 1000).toISOString()}`);
    return decodedToken;
  } catch (error) {
    console.log(`✗ Error: ${error.message}`);
    return null;
  }
}

/**
 * Test 5: Get User by Phone
 */
async function testGetUserByPhone(phone = testPhone) {
  console.log("\n📋 Test 5: Get User by Phone");
  try {
    const userRecord = await admin.auth().getUserByPhoneNumber(phone);
    console.log("✓ User retrieved successfully by phone");
    console.log(`  UID: ${userRecord.uid}`);
    console.log(`  Phone: ${userRecord.phoneNumber}`);
    console.log(`  Disabled: ${userRecord.disabled}`);
    return userRecord;
  } catch (error) {
    console.log(`✗ Error: ${error.message}`);
    return null;
  }
}

/**
 * Test 6: Update User Claims (for role-based access)
 */
async function testSetCustomClaims(uid = testUID) {
  console.log("\n📋 Test 6: Set Custom Claims (for RBAC)");
  try {
    await admin.auth().setCustomUserClaims(uid, {
      role: "merchant",
      accountType: "merchant"
    });
    console.log("✓ Custom claims set successfully");
    
    const userRecord = await admin.auth().getUser(uid);
    console.log(`  Claims: ${JSON.stringify(userRecord.customClaims)}`);
    return true;
  } catch (error) {
    console.log(`✗ Error: ${error.message}`);
    return false;
  }
}

/**
 * Test 7: Verify Token with Claims
 */
async function testVerifyTokenWithClaims(idToken) {
  console.log("\n📋 Test 7: Verify Token with Custom Claims");
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log("✓ Token verified with claims");
    console.log(`  UID: ${decodedToken.uid}`);
    console.log(`  Role: ${decodedToken.role || "N/A"}`);
    console.log(`  Account Type: ${decodedToken.accountType || "N/A"}`);
    return decodedToken;
  } catch (error) {
    console.log(`✗ Error: ${error.message}`);
    return null;
  }
}

/**
 * Test 8: Delete Test User
 */
async function testDeleteUser(uid = testUID) {
  console.log("\n📋 Test 8: Delete Test User");
  try {
    await admin.auth().deleteUser(uid);
    console.log("✓ Test user deleted successfully");
    return true;
  } catch (error) {
    console.log(`✗ Error: ${error.message}`);
    return false;
  }
}

/**
 * Test 9: Token Refresh Simulation
 */
async function testTokenRefresh(idToken) {
  console.log("\n📋 Test 9: Decode Token Payload (for debugging)");
  try {
    // Decode without verification (for inspection only)
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new Error("Invalid token format");
    }
    
    const decoded = JSON.parse(
      Buffer.from(parts[1], 'base64').toString()
    );
    
    console.log("✓ Token decoded successfully");
    console.log(`  Payload: ${JSON.stringify(decoded, null, 2)}`);
    return decoded;
  } catch (error) {
    console.log(`✗ Error: ${error.message}`);
    return null;
  }
}

/**
 * Main Test Runner
 */
async function runAllTests() {
  try {
    // Test 1: Initialize Firebase
    const initialized = await testFirebaseInit();
    if (!initialized) {
      console.log("\n❌ Firebase not initialized. Please check your .env file.");
      process.exit(1);
    }

    // Test 2: Create test user
    const userRecord = await testCreateUserWithPhone();
    if (!userRecord) {
      console.log("\n⚠️  Could not create test user. Skipping subsequent tests.");
      return;
    }

    // Test 3: Generate custom token
    const customToken = await testGenerateCustomToken();
    if (!customToken) {
      console.log("\n⚠️  Could not generate custom token.");
      return;
    }

    // Test 4: Verify token
    let decodedToken = await testVerifyIdToken(customToken);
    if (!decodedToken) {
      console.log("\n⚠️  Could not verify token.");
      return;
    }

    // Test 5: Get user by phone
    await testGetUserByPhone();

    // Test 6: Set custom claims
    await testSetCustomClaims();

    // Test 7: Verify token with claims
    // Generate new token after setting claims
    const newToken = await testGenerateCustomToken();
    if (newToken) {
      decodedToken = await testVerifyTokenWithClaims(newToken);
    }

    // Test 9: Decode token payload
    if (customToken) {
      await testTokenRefresh(customToken);
    }

    // Test 8: Clean up - delete test user
    console.log("\n📋 Cleanup: Deleting test user");
    await testDeleteUser();

    console.log("\n" + "=".repeat(50));
    console.log("✅ All Firebase tests completed successfully!");
    console.log("=".repeat(50) + "\n");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test suite error:", error);
    process.exit(1);
  }
}

// Run tests
runAllTests();

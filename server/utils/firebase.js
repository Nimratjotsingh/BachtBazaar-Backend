import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBo0R9ed_TgwzceUbtWE4UhwCZAbt0BhRE",
  authDomain: "bachatbazaar-17716.firebaseapp.com",
  projectId: "bachatbazaar-17716",
  storageBucket: "bachatbazaar-17716.firebasestorage.app",
  messagingSenderId: "921834163028",
  appId: "1:921834163028:web:74961f5e100e07aedb56c1",
  measurementId: "G-HVPHC2W98R",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
export const messaging = typeof window !== "undefined" ? getMessaging(app) : null;

// Your VAPID Key / Web Push Certificate
const VAPID_KEY = "BMfojWixROhqKu1zffKMaT2wDGaABxwQ6Pyg6JuxhMRZDqkmXnD1tx-EhTzYAkkWg75B5z4pBywBRuEgC7JfOCM";

/**
 * Request permission & generate FCM Token to send to your backend server
 */
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      console.log("FCM Web Push Token generated:", token);
      return token; // Send this token to your backend API route (/api/merchant/fcm-token or /api/user/fcm-token)
    } else {
      console.warn("Notification permission denied by user.");
      return null;
    }
  } catch (error) {
    console.error("Error retrieving FCM Token:", error);
    return null;
  }
};

/**
 * Listen for foreground push notifications when the web app is open
 */
export const onForegroundMessage = (callback) => {
  if (messaging) {
    onMessage(messaging, (payload) => {
      console.log("Foreground Push Received:", payload);
      callback(payload);
    });
  }
};
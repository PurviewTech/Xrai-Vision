// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage"; // Import Firebase Storage
import { getMessaging, getToken, onMessage } from "firebase/messaging"; // Import FCM

const firebaseConfig = {

  // apiKey: "AIzaSyCleSrLuUjKKzS0GL0TIf3tx0VmfGIAAEk",
  // authDomain: "surgyview-be95e.firebaseapp.com",
  // databaseURL: "https://surgyview-be95e-default-rtdb.firebaseio.com",
  // projectId: "surgyview-be95e",
  // storageBucket: "surgyview-be95e.firebasestorage.app",
  // messagingSenderId: "848741645650",
  // appId: "1:848741645650:web:9eb10681d9b20d069ace8b",
  // measurementId: "G-GR8XWZWPF9"

  apiKey: "AIzaSyAhnSrmFmORLNNn0m5FRlnCVFsdz9e1Ye0",
  authDomain: "xraivision-2fc49.firebaseapp.com",
  databaseURL: "https://xraivision-2fc49-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "xraivision-2fc49",
  storageBucket: "xraivision-2fc49.firebasestorage.app",
  messagingSenderId: "469449360476",
  appId: "1:469449360476:web:ea9c235659619ea8941299",
  measurementId: "G-WGEKRGPYEC" 


  // apiKey: "AIzaSyAhnSrmFmORLNNn0m5FRlnCVFsdz9e1Ye0",
  // authDomain: "xraivision-2fc49.firebaseapp.com",
  // databaseURL: "https://xraivision-2fc49-default-rtdb.asia-southeast1.firebasedatabase.app",
  // projectId: "xraivision-2fc49",
  // storageBucket: "xraivision-2fc49.firebasestorage.app",
  // messagingSenderId: "469449360476",
  // appId: "1:469449360476:web:ea9c235659619ea8941299",
  // measurementId: "G-WGEKRGPYEC" 

  // apiKey: "AIzaSyDeY0bRMpachx2aGD-0XuMlCCiRcTCGWVM",
  // authDomain: "xraivision-64aba.firebaseapp.com",
  // databaseURL: "https://xraivision-64aba-default-rtdb.asia-southeast1.firebasedatabase.app",
  // projectId: "xraivision-64aba",
  // storageBucket: "xraivision-64aba.firebasestorage.app",
  // messagingSenderId: "17242386677",
  // appId: "1:17242386677:web:56e2b6e29b5169e1fb95bc",
  // measurementId: "G-SH4VJX9VJY"

  // // //XRAIVISION VERSION 1
  // apiKey: "AIzaSyAhnSrmFmORLNNn0m5FRlnCVFsdz9e1Ye0",
  // authDomain: "xraivision-2fc49.firebaseapp.com",
  // databaseURL: "https://xraivision-2fc49-default-rtdb.asia-southeast1.firebasedatabase.app",
  // projectId: "xraivision-2fc49",
  // storageBucket: "xraivision-2fc49.firebasestorage.app",
  // messagingSenderId: "469449360476",
  // appId: "1:469449360476:web:ea9c235659619ea8941299",
  // measurementId: "G-WGEKRGPYEC"

};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const database = getDatabase(app);
const storage = getStorage(app); // Initialize Firebase Storage

// Initialize Firebase Cloud Messaging
let messaging = null;
try {
  messaging = getMessaging(app);
} catch (error) {
  console.log("FCM not supported in this environment:", error);
}

// Debugging Log
console.log("Firebase initialized:", app);

// Export the necessary Firebase instances
export { auth, db, database, storage, messaging }; // Export FCM messaging







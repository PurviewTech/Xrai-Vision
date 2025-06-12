// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage"; // Import Firebase Storage


const firebaseConfig = {
  // purviewx testing firebase
  apiKey: "AIzaSyCleSrLuUjKKzS0GL0TIf3tx0VmfGIAAEk",
  authDomain: "surgyview-be95e.firebaseapp.com",
  databaseURL: "https://surgyview-be95e-default-rtdb.firebaseio.com",
  projectId: "surgyview-be95e",
  storageBucket: "surgyview-be95e.firebasestorage.app",
  messagingSenderId: "848741645650",
  appId: "1:848741645650:web:9eb10681d9b20d069ace8b",
  measurementId: "G-GR8XWZWPF9"

  // apiKey: "AIzaSyAhnSrmFmORLNNn0m5FRlnCVFsdz9e1Ye0",
 
  // authDomain: "xraivision-2fc49.firebaseapp.com",
 
  // databaseURL: "https://xraivision-2fc49-default-rtdb.asia-southeast1.firebasedatabase.app",
 
  // projectId: "xraivision-2fc49",
 
  // storageBucket: "xraivision-2fc49.firebasestorage.app",
 
  // messagingSenderId: "469449360476",
 
  // appId: "1:469449360476:web:ea9c235659619ea8941299",
 
  // measurementId: "G-WGEKRGPYEC"
 

  
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

// Debugging Log
console.log("Firebase initialized:", app);

// Export the necessary Firebase instances
export { auth, db, database, storage }; // Export Firebase Storage







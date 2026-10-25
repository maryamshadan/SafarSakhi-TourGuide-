
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDNjKhaHdVOuw0UU0afqaJbfma9IR7igJU",
  authDomain: "tourguide-9b72a.firebaseapp.com",
  projectId: "tourguide-9b72a",
  storageBucket: "tourguide-9b72a.firebasestorage.app",
  messagingSenderId: "120544825664",
  appId: "1:120544825664:web:b646c49de59a2b13bdeaa5",
  measurementId: "G-EJB3EXYMQG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firestore
export const firestoreDB = getFirestore(app);

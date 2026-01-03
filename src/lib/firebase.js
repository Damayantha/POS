import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAkdYjpY1uGnAxxh51XKERU7po_zOIPFwU",
    authDomain: "posbycirvex.firebaseapp.com",
    projectId: "posbycirvex",
    storageBucket: "posbycirvex.firebasestorage.app",
    messagingSenderId: "704117283422",
    appId: "1:704117283422:web:a0309586f2a34daef472cf",
    measurementId: "G-8QY3VX10LB"
};

// Initialize Firebase safely (prevents duplicate app errors in HMR)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDkjdPNXimp2bT0YJcAuBagvHQ0Jaa0VEM",
  authDomain: "pierc-portal-9bd82.firebaseapp.com",
  databaseURL: "https://pierc-portal-9bd82-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pierc-portal-9bd82",
  storageBucket: "pierc-portal-9bd82.firebasestorage.app",
  messagingSenderId: "404763694104",
  appId: "1:404763694104:web:2c3062d39443449d9e5f6d"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Messaging initialization
const messaging = async () => {
  const supported = await isSupported();
  return supported ? getMessaging(app) : null;
};

export { app, auth, db, storage, messaging };

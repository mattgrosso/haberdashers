import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyC2JMoMSBdJ1H7tABdKb884iSQ2f2iGvqE",
  authDomain: "haberdasher-eb1f0.firebaseapp.com",
  projectId: "haberdasher-eb1f0",
  storageBucket: "haberdasher-eb1f0.firebasestorage.app",
  messagingSenderId: "43461230857",
  appId: "1:43461230857:web:b0566d62f32685500f93d8",
  measurementId: "G-ZEV2KYH31P"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const database = getDatabase(app);

export { auth, googleProvider, database };
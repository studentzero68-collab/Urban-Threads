import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCvKaE0ITexQsJ6Mrja2AYLcwnVQXPwjRY",
  authDomain: "check-it-c3888.firebaseapp.com",
  projectId: "check-it-c3888",
  storageBucket: "check-it-c3888.firebasestorage.app",
  messagingSenderId: "365529667574",
  appId: "1:365529667574:web:9570036a8329b40ddb59d7",
  measurementId: "G-57FNRPDTPK"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
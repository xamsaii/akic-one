import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB8p3TDCWs_agy1_rCzwc7Ew6MfgD9wlpY",
  authDomain: "akic-one.firebaseapp.com",
  projectId: "akic-one",
  storageBucket: "akic-one.firebasestorage.app",
  messagingSenderId: "933538576874",
  appId: "1:933538576874:web:611accae6bf9cd34dd1a93"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

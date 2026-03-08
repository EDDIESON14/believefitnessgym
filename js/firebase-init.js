// =============================================
// FIREBASE CONFIGURATION
// =============================================
// STEP 1: Go to https://console.firebase.google.com
// STEP 2: Create a project → Add Web App
// STEP 3: Copy your config and paste it below
// =============================================

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "believe-fitness-xxxxx.firebaseapp.com",
  projectId: "believe-fitness-xxxxx",
  storageBucket: "believe-fitness-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc123"
};

// =============================================
// FIREBASE SERVICE ACCOUNT
// =============================================
// This is a hidden app-level account used to
// authenticate the app with Firebase securely.
// Staff still use their own username/password
// on the login page — this is separate.
//
// STEP: Set these to any email/password you want.
// Then go to Firebase Console → Authentication →
// Add user → enter this same email/password.
// =============================================
const FIREBASE_APP_EMAIL    = "rubinarioeddieson@gmail.com";
const FIREBASE_APP_PASSWORD = "eddiesonfitness123";


// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log('[Firebase] Connected to project:', firebaseConfig.projectId);
} catch(e) {
  console.warn('[Firebase] Init failed — running in offline mode:', e.message);
}

// =============================================
// FIREBASE CONFIGURATION
// =============================================
// STEP 1: Go to https://console.firebase.google.com
// STEP 2: Create a project → Add Web App
// STEP 3: Copy your config and paste it below
// =============================================

const firebaseConfig = {
  apiKey: "AIzaSyDGs8xxeItC5dyfW-48vfn1_U4Y57loocw",
  authDomain: "believe-fitness-center.firebaseapp.com",
  projectId: "believe-fitness-center",
  storageBucket: "believe-fitness-center.firebasestorage.app",
  messagingSenderId: "71117912899",
  appId: "1:71117912899:web:27cb85728188cbb2bd4df6",
  measurementId: "G-E7XE3YLP38"
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log('[Firebase] Connected to project:', firebaseConfig.projectId);
} catch(e) {
  console.warn('[Firebase] Init failed — running in offline mode:', e.message);
}

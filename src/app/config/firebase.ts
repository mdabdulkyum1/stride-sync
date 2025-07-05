import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    // Try to use service account key file first
    const firebaseConfig = require('./serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig as admin.ServiceAccount),
    });
    console.log('🔥 Firebase initialized with service account key ✅');
  } catch (error) {
    console.error('❌ Failed to load service account key:', error);
    
    // Fallback to environment variables
    if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
        credential: admin.credential.applicationDefault(),
      });
      console.log('🔥 Firebase initialized with environment variables ✅');
    } else {
      console.error('❌ Firebase configuration not found. Please check your service account key or environment variables.');
      throw new Error('Firebase configuration not found');
    }
  }
}

const db = admin.firestore();

console.log('🔥 Firestore connected successfully ✅');

export default db;

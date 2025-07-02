import admin from 'firebase-admin';
import firebaseConfig from './serviceAccountKey.json';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig as admin.ServiceAccount),
  });
}

const db = admin.firestore();

console.log('🔥 Firestore connected successfully ✅');

export default db;

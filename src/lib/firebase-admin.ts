import * as admin from 'firebase-admin';

const getPrivateKey = () => {
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!rawKey) return undefined;
  // Handle surrounding quotes, Windows \r\n, and literal \n sequences
  return rawKey
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\r/g, '')
    .replace(/\\n/g, '\n');
};

export function getFirebaseAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: getPrivateKey(),
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }
  return admin;
}

export const adminAuth = () => getFirebaseAdmin().auth();
export const adminDb = () => getFirebaseAdmin().firestore();
export const adminStorage = () => getFirebaseAdmin().storage();

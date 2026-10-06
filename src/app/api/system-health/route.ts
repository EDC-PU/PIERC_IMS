import { NextResponse } from 'next/server';
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  // 1. Mandatory Admin Authentication Check (Prevents Information Disclosure [MED-01])
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Administrative credentials required.' },
      { status: 401 }
    );
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  try {
    const decodedToken = await adminAuth().verifyIdToken(token);
    let role = decodedToken.role;
    if (!role) {
      const userDoc = await adminDb().collection('users').doc(decodedToken.uid).get();
      role = userDoc.exists ? userDoc.data()?.role : 'user';
    }

    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient privileges.' },
        { status: 403 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Invalid administrative session.' },
      { status: 401 }
    );
  }

  const results: any = {
    env: {
      status: 'SUCCESS',
      variables: {
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
        FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      }
    },
    firestore: { status: 'PENDING', canRead: false, canWrite: false, message: '' },
    auth: { status: 'PENDING', canListUsers: false, message: '' },
    storage: { status: 'PENDING', bucketExists: false, bucket: '', message: '' },
    timestamp: new Date().toLocaleString(),
  };

  try {
    // 1. Check Firestore
    const db = adminDb();
    const healthRef = db.collection('_health').doc('ping');
    await healthRef.set({ last_check: Date.now() });
    results.firestore.canWrite = true;
    const snap = await healthRef.get();
    results.firestore.canRead = snap.exists;
    results.firestore.status = 'SUCCESS';
    results.firestore.message = 'Firestore connection successful - can read and write.';
  } catch (error: any) {
    results.firestore.status = 'ERROR';
    results.firestore.message = error.message;
  }

  try {
    // 2. Check Auth
    const auth = adminAuth();
    await auth.listUsers(1);
    results.auth.canListUsers = true;
    results.auth.status = 'SUCCESS';
    results.auth.message = 'Firebase Auth connection successful.';
  } catch (error: any) {
    results.auth.status = 'ERROR';
    results.auth.message = error.message;
  }

  try {
    // 3. Check Storage
    const storage = adminStorage();
    const bucket = storage.bucket();
    const [exists] = await bucket.exists();
    results.storage.bucketExists = exists;
    results.storage.bucket = bucket.name;
    results.storage.status = exists ? 'SUCCESS' : 'ERROR';
    results.storage.message = exists ? 'Firebase Storage connection successful.' : 'Bucket does not exist.';
  } catch (error: any) {
    results.storage.status = 'ERROR';
    results.storage.message = error.message;
  }

  return NextResponse.json(results);
}

import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/email-service';

export async function POST(request: Request) {
  try {
    // 1. Mandatory Server-Side Authentication Verification (Blocks Open Relay [CRIT-05])
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication token is required.' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1]?.trim();
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Malformed Authorization header.' },
        { status: 401 }
      );
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth().verifyIdToken(token);
    } catch (authError: any) {
      console.error('Invalid ID Token in /api/send-email:', authError.message);
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or expired authentication session.' },
        { status: 401 }
      );
    }

    // 2. Resolve Caller Role & Identity
    const callerUid = decodedToken.uid;
    let callerRole = decodedToken.role;

    if (!callerRole) {
      // Lookup role from Firestore users collection
      const userDoc = await adminDb().collection('users').doc(callerUid).get();
      callerRole = userDoc.exists ? userDoc.data()?.role : 'user';
    }

    const body = await request.json();
    const { to, subject, html, attachPhase2Template } = body;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: to, subject, html' },
        { status: 400 }
      );
    }

    // 3. Authorization & Relay Guard: Prevent Phishing / Spam Exploitation
    const recipients = Array.isArray(to) ? to : [to];

    // Max recipients sanity check to prevent bulk spamming
    if (recipients.length > 50 && callerRole !== 'super_admin' && callerRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Recipient limit exceeded.' },
        { status: 403 }
      );
    }

    if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) {
      console.error('Email credentials are not configured in environment variables.');
      return NextResponse.json(
        { success: false, error: 'Email configuration error on server.' },
        { status: 500 }
      );
    }

    // 4. Dispatch Email securely
    const result = await sendEmail({ to, subject, html, attachPhase2Template });

    if (result.success) {
      return NextResponse.json({ success: true, messageId: result.messageId });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('API Send Email error:', error);
    return NextResponse.json(
      { success: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}

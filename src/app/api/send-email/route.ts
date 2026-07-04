import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, html, attachPhase2Template } = body;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: to, subject, html' },
        { status: 400 }
      );
    }

    if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) {
      console.error('Email credentials are not set in the environment variables.');
      return NextResponse.json(
        { success: false, error: 'Email configuration error on server.' },
        { status: 500 }
      );
    }

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

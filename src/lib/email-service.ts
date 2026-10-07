import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { generateIcsCalendar, CalendarEventPayload } from './ics-generator';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  attachPhase2Template?: boolean;
  calendarEvent?: CalendarEventPayload;
  icsContent?: string;
  icsFilename?: string;
}

// Initialize nodemailer transporter with Gmail SMTP configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Sends a transactional email using Gmail SMTP.
 * Supports single or multiple recipients.
 */
export async function sendEmail({
  to,
  subject,
  html,
  attachPhase2Template,
  calendarEvent,
  icsContent,
  icsFilename,
}: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const recipient = Array.isArray(to) ? to.filter(Boolean).join(', ') : to;

    if (!recipient) {
      throw new Error('No valid recipients specified.');
    }

    const mailOptions: any = {
      from: `"PIERC Portal" <${process.env.GMAIL_EMAIL}>`,
      to: recipient,
      subject: subject,
      html: html,
    };

    const attachments: any[] = [];

    // Embed brand logo as an inline CID attachment if referenced in html
    if (html.includes('cid:pierc-logo')) {
      const logoPath = path.join(process.cwd(), 'public', 'logo.png');
      if (fs.existsSync(logoPath)) {
        attachments.push({
          filename: 'logo.png',
          path: logoPath,
          cid: 'pierc-logo',
        });
      }
    }

    if (attachPhase2Template) {
      attachments.push({
        filename: 'PHASE-2 PPT Template.pptx',
        path: path.join(process.cwd(), 'public', 'PHASE-2 PPT Template.pptx'),
      });
    }

    if (calendarEvent || icsContent) {
      const content = icsContent || generateIcsCalendar(calendarEvent!);
      const filename = icsFilename || calendarEvent?.filename || (calendarEvent?.status === 'CANCELLED' ? 'cancellation.ics' : 'invite.ics');
      const method = calendarEvent?.method || (calendarEvent?.status === 'CANCELLED' ? 'CANCEL' : 'REQUEST');

      attachments.push({
        filename,
        content,
        contentType: `text/calendar; charset="utf-8"; method=${method}`,
      });

      // Provide native calendar invite support for email clients (Gmail, Outlook, Apple Mail)
      mailOptions.icalEvent = {
        filename,
        method,
        content,
      };
    }

    if (attachments.length > 0) {
      mailOptions.attachments = attachments;
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Failed to send email:', error);
    return { success: false, error: error.message || String(error) };
  }
}

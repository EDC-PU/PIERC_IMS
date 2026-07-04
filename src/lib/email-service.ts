import nodemailer from 'nodemailer';
import path from 'path';

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  attachPhase2Template?: boolean;
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
export async function sendEmail({ to, subject, html, attachPhase2Template }: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
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

    if (attachPhase2Template) {
      mailOptions.attachments = [
        {
          filename: 'PHASE-2 PPT Template.pptx',
          path: path.join(process.cwd(), 'public', 'PHASE-2 PPT Template.pptx'),
        }
      ];
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Failed to send email:', error);
    return { success: false, error: error.message || String(error) };
  }
}

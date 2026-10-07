import { auth } from '@/lib/firebase';
import type { CalendarEventPayload } from '@/lib/ics-generator';

export type { CalendarEventPayload };

/**
 * Client-side helper to trigger email notifications via the server-side API.
 * Automatically attaches the authenticated Firebase ID token for verification.
 */
export async function triggerEmailNotification(options: {
  to: string | string[];
  subject: string;
  html: string;
  attachPhase2Template?: boolean;
  calendarEvent?: CalendarEventPayload;
  icsContent?: string;
  icsFilename?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const currentUser = auth.currentUser;
    if (currentUser) {
      const token = await currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers,
      body: JSON.stringify(options),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send email notification');
    }

    return { success: true };
  } catch (error: any) {
    console.error('triggerEmailNotification failed:', error);
    return { success: false, error: error.message || String(error) };
  }
}

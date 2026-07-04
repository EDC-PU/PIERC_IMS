/**
 * Client-side helper to trigger email notifications via the server-side API.
 */
export async function triggerEmailNotification(options: {
  to: string | string[];
  subject: string;
  html: string;
  attachPhase2Template?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

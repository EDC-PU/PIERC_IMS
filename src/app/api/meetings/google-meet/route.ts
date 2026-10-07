import { NextResponse } from 'next/server';

function formatGoogleCalendarDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      accessToken,
      title = 'Group Meeting',
      startTime = Date.now(),
      endTime = Date.now() + 3600000,
      description = ''
    } = body;

    let meetingUri = '';
    let meetingCode = '';

    // If an OAuth access token is provided, create the live space using Google Meet REST API v2
    if (accessToken) {
      try {
        const meetRes = await fetch('https://meet.googleapis.com/v2/spaces', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        });

        const meetData = await meetRes.json();
        if (meetData.meetingUri) {
          meetingUri = meetData.meetingUri;
          meetingCode = meetData.meetingCode || meetData.meetingUri.replace('https://meet.google.com/', '');
        } else if (meetData.error) {
          console.warn('Google Meet API error response:', meetData.error);
        }
      } catch (apiErr) {
        console.warn('Failed to call meet.googleapis.com with token:', apiErr);
      }
    }

    // Format calendar dates (ISO compact in UTC)
    const startStr = formatGoogleCalendarDate(startTime);
    const endStr = formatGoogleCalendarDate(endTime);

    const calendarDetails = [
      description,
      '',
      meetingUri ? `Join Google Meet: ${meetingUri}` : '',
      'Hosted on PIERC Innovation & Incubation Portal'
    ].filter(Boolean).join('\n');

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      title
    )}&dates=${startStr}/${endStr}&details=${encodeURIComponent(
      calendarDetails
    )}&location=${encodeURIComponent(meetingUri || 'https://meet.google.com/new')}`;

    return NextResponse.json({
      success: true,
      meetingCode,
      meetingUri,
      calendarUrl,
    });
  } catch (error: any) {
    console.error('Error in google-meet route:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

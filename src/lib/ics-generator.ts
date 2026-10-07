/**
 * RFC 5545 compliant iCalendar (.ics) generator.
 * Generates calendar invite files compatible with Google Calendar, Apple Calendar, Outlook, and mobile devices.
 */

export interface CalendarEventPayload {
  title: string;
  description?: string;
  location?: string;
  startTime: number | string | Date;
  endTime?: number | string | Date;
  durationMinutes?: number; // default: 30 minutes if endTime is not provided
  isAllDay?: boolean; // For date-only periods (e.g. cohorts)
  url?: string;
  status?: 'CONFIRMED' | 'CANCELLED';
  method?: 'REQUEST' | 'CANCEL' | 'PUBLISH';
  organizerName?: string;
  organizerEmail?: string;
  uid?: string;
  filename?: string;
}

/**
 * Escapes characters per RFC 5545 specifications.
 */
function escapeIcsText(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Folds lines longer than 75 octets per RFC 5545 specifications.
 */
function foldLine(line: string): string {
  const maxLen = 74;
  if (line.length <= maxLen) return line;

  const parts: string[] = [];
  let cur = line;
  parts.push(cur.slice(0, maxLen));
  cur = cur.slice(maxLen);

  while (cur.length > 0) {
    parts.push(' ' + cur.slice(0, maxLen - 1));
    cur = cur.slice(maxLen - 1);
  }
  return parts.join('\r\n');
}

function parseDateInput(dateInput: number | string | Date): Date {
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'number') return new Date(dateInput);
  const parsed = new Date(dateInput);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatIcsDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function formatIcsDateOnly(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Generates an RFC 5545 formatted .ics calendar string.
 */
export function generateIcsCalendar(options: CalendarEventPayload): string {
  const now = new Date();
  const dtStamp = formatIcsDateTime(now);
  const startDate = parseDateInput(options.startTime);

  let endDate: Date;
  if (options.endTime) {
    endDate = parseDateInput(options.endTime);
  } else {
    const durationMs = (options.durationMinutes || 30) * 60 * 1000;
    endDate = new Date(startDate.getTime() + durationMs);
  }

  const status = options.status || 'CONFIRMED';
  const method = options.method || (status === 'CANCELLED' ? 'CANCEL' : 'REQUEST');
  const uid = options.uid || `${startDate.getTime()}-${Math.random().toString(36).substring(2, 9)}@pierc.org`;
  const organizerName = options.organizerName || 'Parul Innovation & Entrepreneurship Research Centre (PIERC)';
  const organizerEmail = options.organizerEmail || process.env.GMAIL_EMAIL || 'programs.pierc@paruluniversity.ac.in';

  const rawLines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PIERC IMS//PIERC Portal Calendar//EN',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
  ];

  if (options.isAllDay) {
    rawLines.push(`DTSTART;VALUE=DATE:${formatIcsDateOnly(startDate)}`);
    // RFC 5545: DTEND for all-day events is non-inclusive, so add 1 day if start == end
    const effectiveEndDate = endDate.getTime() <= startDate.getTime()
      ? new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
      : endDate;
    rawLines.push(`DTEND;VALUE=DATE:${formatIcsDateOnly(effectiveEndDate)}`);
  } else {
    rawLines.push(`DTSTART:${formatIcsDateTime(startDate)}`);
    rawLines.push(`DTEND:${formatIcsDateTime(endDate)}`);
  }

  rawLines.push(`SUMMARY:${escapeIcsText(options.title)}`);

  if (options.description) {
    rawLines.push(`DESCRIPTION:${escapeIcsText(options.description)}`);
  }

  if (options.location) {
    rawLines.push(`LOCATION:${escapeIcsText(options.location)}`);
  }

  if (options.url) {
    rawLines.push(`URL:${escapeIcsText(options.url)}`);
  }

  rawLines.push(`STATUS:${status}`);
  rawLines.push(`SEQUENCE:${status === 'CANCELLED' ? 1 : 0}`);
  rawLines.push('TRANSP:OPAQUE');

  if (organizerEmail) {
    rawLines.push(`ORGANIZER;CN="${escapeIcsText(organizerName)}":mailto:${organizerEmail}`);
  }

  rawLines.push('END:VEVENT');
  rawLines.push('END:VCALENDAR');

  return rawLines.map(foldLine).join('\r\n') + '\r\n';
}

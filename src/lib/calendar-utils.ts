// Utility functions for generating calendar links

export interface CalendarEvent {
  title: string;
  description: string;
  startDate: string; // YYYY-MM-DD format
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  timezone: string;
  location?: string;
}

// Strip HTML tags from description for calendar events
const stripHtml = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
};

// Normalize time to HH:MM format (handles HH:MM:SS from database)
const normalizeTime = (time: string): string => {
  if (!time) return '00:00';
  // Extract only HH:MM, ignoring seconds if present
  const parts = time.split(':');
  return `${parts[0].padStart(2, '0')}${(parts[1] || '00').padStart(2, '0')}`;
};

// Convert date and time to ISO format for calendar links
const toISODateTime = (date: string, time: string): string => {
  // Remove any timezone offset and format as YYYYMMDDTHHMMSS
  const normalizedTime = normalizeTime(time);
  return `${date.replace(/-/g, '')}T${normalizedTime}00`;
};

// Generate Google Calendar URL
export const generateGoogleCalendarUrl = (event: CalendarEvent): string => {
  const startDateTime = toISODateTime(event.startDate, event.startTime);
  const endDateTime = toISODateTime(event.startDate, event.endTime);
  const cleanDescription = stripHtml(event.description);
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startDateTime}/${endDateTime}`,
    details: cleanDescription,
    ctz: event.timezone,
  });
  
  if (event.location) {
    params.append('location', event.location);
  }
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

// Normalize time to HH:MM:SS for ISO format
const normalizeTimeForISO = (time: string): string => {
  if (!time) return '00:00:00';
  const parts = time.split(':');
  const hours = (parts[0] || '00').padStart(2, '0');
  const mins = (parts[1] || '00').padStart(2, '0');
  const secs = (parts[2] || '00').padStart(2, '0');
  return `${hours}:${mins}:${secs}`;
};

// Generate Outlook Calendar URL
export const generateOutlookCalendarUrl = (event: CalendarEvent): string => {
  // Format dates for Outlook - needs ISO 8601 format
  const startDateTime = `${event.startDate}T${normalizeTimeForISO(event.startTime)}`;
  const endDateTime = `${event.startDate}T${normalizeTimeForISO(event.endTime)}`;
  const cleanDescription = stripHtml(event.description);
  
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    body: cleanDescription,
    startdt: startDateTime,
    enddt: endDateTime,
  });
  
  if (event.location) {
    params.append('location', event.location);
  }
  
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};

// Generate Outlook Office 365 URL (for corporate accounts)
export const generateOutlook365CalendarUrl = (event: CalendarEvent): string => {
  const startDateTime = `${event.startDate}T${normalizeTimeForISO(event.startTime)}`;
  const endDateTime = `${event.startDate}T${normalizeTimeForISO(event.endTime)}`;
  const cleanDescription = stripHtml(event.description);
  
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    body: cleanDescription,
    startdt: startDateTime,
    enddt: endDateTime,
  });
  
  if (event.location) {
    params.append('location', event.location);
  }
  
  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
};

// Generate .ics file content for downloading
export const generateICSContent = (event: CalendarEvent): string => {
  const startDateTime = toISODateTime(event.startDate, event.startTime);
  const endDateTime = toISODateTime(event.startDate, event.endTime);
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@acloudforeveryone.org`;
  const cleanDescription = stripHtml(event.description);
  
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ACFE//Mentorship Sessions//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=${event.timezone}:${startDateTime}`,
    `DTEND;TZID=${event.timezone}:${endDateTime}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${cleanDescription.replace(/\n/g, '\\n')}`,
  ];
  
  if (event.location) {
    lines.push(`LOCATION:${event.location}`);
  }
  
  lines.push('END:VEVENT', 'END:VCALENDAR');
  
  return lines.join('\r\n');
};

// Download .ics file
export const downloadICSFile = (event: CalendarEvent, filename?: string): void => {
  const content = generateICSContent(event);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

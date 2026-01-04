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

// Convert date and time to ISO format for calendar links
const toISODateTime = (date: string, time: string): string => {
  // Remove any timezone offset and format as YYYYMMDDTHHMMSS
  return `${date.replace(/-/g, '')}T${time.replace(/:/g, '')}00`;
};

// Generate Google Calendar URL
export const generateGoogleCalendarUrl = (event: CalendarEvent): string => {
  const startDateTime = toISODateTime(event.startDate, event.startTime);
  const endDateTime = toISODateTime(event.startDate, event.endTime);
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startDateTime}/${endDateTime}`,
    details: event.description,
    ctz: event.timezone,
  });
  
  if (event.location) {
    params.append('location', event.location);
  }
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

// Generate Outlook Calendar URL
export const generateOutlookCalendarUrl = (event: CalendarEvent): string => {
  // Format dates for Outlook - needs ISO 8601 format
  const startDateTime = `${event.startDate}T${event.startTime}:00`;
  const endDateTime = `${event.startDate}T${event.endTime}:00`;
  
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    body: event.description,
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
  const startDateTime = `${event.startDate}T${event.startTime}:00`;
  const endDateTime = `${event.startDate}T${event.endTime}:00`;
  
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    body: event.description,
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
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
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

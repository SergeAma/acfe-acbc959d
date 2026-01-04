import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, Download, ExternalLink } from 'lucide-react';
import {
  CalendarEvent,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  downloadICSFile,
} from '@/lib/calendar-utils';

interface AddToCalendarButtonProps {
  event: CalendarEvent;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export const AddToCalendarButton = ({
  event,
  variant = 'outline',
  size = 'sm',
  className,
}: AddToCalendarButtonProps) => {
  const [open, setOpen] = useState(false);

  const handleGoogleCalendar = () => {
    window.open(generateGoogleCalendarUrl(event), '_blank');
    setOpen(false);
  };

  const handleOutlookCalendar = () => {
    window.open(generateOutlookCalendarUrl(event), '_blank');
    setOpen(false);
  };

  const handleDownloadICS = () => {
    downloadICSFile(event);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Calendar className="h-4 w-4 mr-1" />
          Add to Calendar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleGoogleCalendar}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOutlookCalendar}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Outlook Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadICS}>
          <Download className="h-4 w-4 mr-2" />
          Download .ics
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

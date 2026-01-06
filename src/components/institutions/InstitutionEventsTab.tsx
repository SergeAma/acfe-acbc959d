import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface InstitutionEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  event_url: string | null;
}

interface NewEvent {
  title: string;
  description: string;
  event_date: string;
  event_url: string;
}

interface InstitutionEventsTabProps {
  events: InstitutionEvent[];
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  newEvent: NewEvent;
  setNewEvent: (event: NewEvent) => void;
  onCreate: () => void;
  onDelete: (eventId: string) => void;
  isCreating: boolean;
}

export const InstitutionEventsTab = ({
  events,
  isDialogOpen,
  setIsDialogOpen,
  newEvent,
  setNewEvent,
  onCreate,
  onDelete,
  isCreating,
}: InstitutionEventsTabProps) => {
  return (
    <>
      <div className="flex justify-end mb-4">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Event Title *</Label>
                <Input
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={newEvent.event_date}
                  onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Event URL (Optional)</Label>
                <Input
                  type="url"
                  value={newEvent.event_url}
                  onChange={(e) => setNewEvent({ ...newEvent, event_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={onCreate}
                disabled={!newEvent.title || isCreating}
              >
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {events.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No events yet</p>
        ) : events.map(event => (
          <div key={event.id} className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="font-medium">{event.title}</p>
              {event.event_date && (
                <p className="text-sm text-muted-foreground">
                  {format(new Date(event.event_date), 'MMM d, yyyy HH:mm')}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(event.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </>
  );
};

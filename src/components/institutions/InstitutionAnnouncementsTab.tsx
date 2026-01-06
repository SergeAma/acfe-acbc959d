import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
}

interface NewAnnouncement {
  title: string;
  content: string;
  is_pinned: boolean;
}

interface InstitutionAnnouncementsTabProps {
  announcements: Announcement[];
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  newAnnouncement: NewAnnouncement;
  setNewAnnouncement: (announcement: NewAnnouncement) => void;
  onCreate: () => void;
  isCreating: boolean;
}

export const InstitutionAnnouncementsTab = ({
  announcements,
  isDialogOpen,
  setIsDialogOpen,
  newAnnouncement,
  setNewAnnouncement,
  onCreate,
  isCreating,
}: InstitutionAnnouncementsTabProps) => {
  return (
    <>
      <div className="flex justify-end mb-4">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Announcement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Content *</Label>
                <Textarea
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_pinned"
                  checked={newAnnouncement.is_pinned}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, is_pinned: e.target.checked })}
                />
                <Label htmlFor="is_pinned">Pin to top</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={onCreate}
                disabled={!newAnnouncement.title || !newAnnouncement.content || isCreating}
              >
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {announcements.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No announcements yet</p>
        ) : announcements.map(ann => (
          <div key={ann.id} className="p-3 rounded-lg border">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium">{ann.title}</p>
              {ann.is_pinned && <Badge variant="outline">Pinned</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{ann.content}</p>
          </div>
        ))}
      </div>
    </>
  );
};

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  StickyNote, 
  Plus, 
  Trash2, 
  Clock, 
  Edit2, 
  Save, 
  X 
} from 'lucide-react';

interface Note {
  id: string;
  note_text: string;
  timestamp_seconds: number | null;
  created_at: string;
}

interface NotesPanelProps {
  contentId: string;
  currentTime?: number;
  onSeek?: (time: number) => void;
}

export const NotesPanel = ({ contentId, currentTime, onSeek }: NotesPanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [includeTimestamp, setIncludeTimestamp] = useState(true);

  useEffect(() => {
    if (user && contentId) {
      fetchNotes();
    }
  }, [user, contentId]);

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('user_notes')
      .select('*')
      .eq('user_id', user?.id)
      .eq('content_id', contentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return;
    }

    setNotes(data || []);
  };

  const addNote = async () => {
    if (!newNote.trim() || !user) return;

    const { data, error } = await supabase
      .from('user_notes')
      .insert({
        user_id: user.id,
        content_id: contentId,
        note_text: newNote.trim(),
        timestamp_seconds: includeTimestamp && currentTime ? Math.floor(currentTime) : null,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save note',
        variant: 'destructive',
      });
      return;
    }

    setNotes([data, ...notes]);
    setNewNote('');
    toast({
      title: 'Note saved',
      description: 'Your note has been saved',
    });
  };

  const updateNote = async (id: string) => {
    if (!editingText.trim()) return;

    const { error } = await supabase
      .from('user_notes')
      .update({
        note_text: editingText.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update note',
        variant: 'destructive',
      });
      return;
    }

    setNotes(notes.map(n => n.id === id ? { ...n, note_text: editingText.trim() } : n));
    setEditingId(null);
    setEditingText('');
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase
      .from('user_notes')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete note',
        variant: 'destructive',
      });
      return;
    }

    setNotes(notes.filter(n => n.id !== id));
  };

  const formatTimestamp = (seconds: number | null) => {
    if (seconds === null) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startEditing = (note: Note) => {
    setEditingId(note.id);
    setEditingText(note.note_text);
  };

  return (
    <Card className="border-border">
      <CardHeader 
        className="cursor-pointer py-3" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center gap-2 text-base">
          <StickyNote className="h-4 w-4 text-primary" />
          My Notes
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
            {notes.length}
          </span>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Add New Note */}
          <div className="space-y-2">
            <Textarea
              placeholder="Add a note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="resize-none"
              rows={3}
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={includeTimestamp}
                  onChange={(e) => setIncludeTimestamp(e.target.checked)}
                  className="rounded border-input"
                />
                Include timestamp
                {includeTimestamp && currentTime && (
                  <span className="text-xs">({formatTimestamp(Math.floor(currentTime))})</span>
                )}
              </label>
              <Button size="sm" onClick={addNote} disabled={!newNote.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Add Note
              </Button>
            </div>
          </div>

          {/* Notes List */}
          <ScrollArea className="h-[200px]">
            <div className="space-y-3 pr-2">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No notes yet. Add your first note above.
                </p>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="group p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    {editingId === note.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="resize-none"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                          <Button size="sm" onClick={() => updateNote(note.id)}>
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm">{note.note_text}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            {note.timestamp_seconds !== null && (
                              <button
                                onClick={() => onSeek?.(note.timestamp_seconds!)}
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <Clock className="h-3 w-3" />
                                {formatTimestamp(note.timestamp_seconds)}
                              </button>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(note.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => startEditing(note)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => deleteNote(note.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
};

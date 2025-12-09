import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Bookmark, Trash2, Play, Clock, MessageSquare } from 'lucide-react';

interface BookmarkItem {
  id: string;
  timestamp_seconds: number | null;
  note: string | null;
  created_at: string;
}

interface BookmarksPanelProps {
  contentId: string;
  onSeek?: (time: number) => void;
}

export const BookmarksPanel = ({ contentId, onSeek }: BookmarksPanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    if (user && contentId) {
      fetchBookmarks();
    }
  }, [user, contentId]);

  const fetchBookmarks = async () => {
    const { data, error } = await supabase
      .from('user_bookmarks')
      .select('*')
      .eq('user_id', user?.id)
      .eq('content_id', contentId)
      .order('timestamp_seconds', { ascending: true });

    if (error) {
      console.error('Error fetching bookmarks:', error);
      return;
    }

    setBookmarks(data || []);
  };

  const addBookmark = async (timestamp: number) => {
    if (!user) return;

    // Check if bookmark already exists at this timestamp
    const existingBookmark = bookmarks.find(
      b => b.timestamp_seconds === timestamp
    );

    if (existingBookmark) {
      toast({
        title: 'Already bookmarked',
        description: 'You already have a bookmark at this time',
      });
      return;
    }

    const { data, error } = await supabase
      .from('user_bookmarks')
      .insert({
        user_id: user.id,
        content_id: contentId,
        timestamp_seconds: timestamp,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add bookmark',
        variant: 'destructive',
      });
      return;
    }

    setBookmarks([...bookmarks, data].sort((a, b) => 
      (a.timestamp_seconds || 0) - (b.timestamp_seconds || 0)
    ));
    
    toast({
      title: 'Bookmarked!',
      description: `Bookmark added at ${formatTimestamp(timestamp)}`,
    });
  };

  const updateBookmarkNote = async (id: string) => {
    const { error } = await supabase
      .from('user_bookmarks')
      .update({ note: noteText || null })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update bookmark',
        variant: 'destructive',
      });
      return;
    }

    setBookmarks(bookmarks.map(b => 
      b.id === id ? { ...b, note: noteText || null } : b
    ));
    setEditingNote(null);
    setNoteText('');
  };

  const deleteBookmark = async (id: string) => {
    const { error } = await supabase
      .from('user_bookmarks')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete bookmark',
        variant: 'destructive',
      });
      return;
    }

    setBookmarks(bookmarks.filter(b => b.id !== id));
  };

  const formatTimestamp = (seconds: number | null) => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Expose addBookmark via window for video player to call
  useEffect(() => {
    (window as any).__addBookmark = addBookmark;
    return () => {
      delete (window as any).__addBookmark;
    };
  }, [bookmarks, user, contentId]);

  return (
    <Card className="border-border">
      <CardHeader 
        className="cursor-pointer py-3" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center gap-2 text-base">
          <Bookmark className="h-4 w-4 text-primary" />
          Bookmarks
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
            {bookmarks.length}
          </span>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          <ScrollArea className="h-[180px]">
            <div className="space-y-2 pr-2">
              {bookmarks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No bookmarks yet. Click the bookmark button while watching to save a moment.
                </p>
              ) : (
                bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="group flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <button
                      onClick={() => bookmark.timestamp_seconds !== null && onSeek?.(bookmark.timestamp_seconds)}
                      className="flex items-center gap-2 text-sm text-primary hover:underline shrink-0"
                    >
                      <Play className="h-3 w-3" />
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(bookmark.timestamp_seconds)}
                    </button>

                    <div className="flex-1 min-w-0">
                      {editingNote === bookmark.id ? (
                        <div className="flex gap-2">
                          <Input
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Add a note..."
                            className="h-7 text-xs"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => updateBookmarkNote(bookmark.id)}
                          >
                            Save
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {bookmark.note ? (
                            <span className="text-sm text-muted-foreground truncate">
                              {bookmark.note}
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingNote(bookmark.id);
                                setNoteText('');
                              }}
                              className="text-xs text-muted-foreground hover:text-foreground"
                            >
                              <MessageSquare className="h-3 w-3 inline mr-1" />
                              Add note
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive shrink-0"
                      onClick={() => deleteBookmark(bookmark.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
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

// Export for external use
export const useBookmarks = (contentId: string) => {
  const addBookmark = (timestamp: number) => {
    if ((window as any).__addBookmark) {
      (window as any).__addBookmark(timestamp);
    }
  };

  return { addBookmark };
};

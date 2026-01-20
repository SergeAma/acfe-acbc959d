import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Search, MessageSquare, Eye } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';

interface MessageWithProfiles {
  id: string;
  content: string;
  attachment_url: string | null;
  attachment_name: string | null;
  is_read: boolean;
  created_at: string;
  sender: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  };
  recipient: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  };
}

interface ConversationThread {
  messages: MessageWithProfiles[];
  participants: string[];
}

export const AdminMessagesOversight = () => {
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<MessageWithProfiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedThread, setSelectedThread] = useState<ConversationThread | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchMessages();
    }
  }, [profile]);

  const fetchMessages = async () => {
    setLoading(true);
    
    // Fetch all private messages with sender/recipient profiles
    const { data, error } = await supabase
      .from('private_messages')
      .select(`
        id,
        content,
        attachment_url,
        attachment_name,
        is_read,
        created_at,
        sender_id,
        recipient_id
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      toast({ title: "Error fetching messages", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setMessages([]);
      setLoading(false);
      return;
    }

    // Get unique user IDs
    const userIds = [...new Set(data.flatMap(m => [m.sender_id, m.recipient_id]))];
    
    // Fetch profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Enrich messages with profile data
    const enrichedMessages: MessageWithProfiles[] = data.map(m => ({
      id: m.id,
      content: m.content,
      attachment_url: m.attachment_url,
      attachment_name: m.attachment_name,
      is_read: m.is_read,
      created_at: m.created_at,
      sender: profileMap.get(m.sender_id) || { id: m.sender_id, full_name: 'Unknown', avatar_url: null, role: 'student' },
      recipient: profileMap.get(m.recipient_id) || { id: m.recipient_id, full_name: 'Unknown', avatar_url: null, role: 'student' },
    }));

    setMessages(enrichedMessages);
    setLoading(false);
  };

  const viewConversation = (senderId: string, recipientId: string) => {
    // Get all messages between these two users
    const threadMessages = messages.filter(m => 
      (m.sender.id === senderId && m.recipient.id === recipientId) ||
      (m.sender.id === recipientId && m.recipient.id === senderId)
    ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const participants = [
      messages.find(m => m.sender.id === senderId)?.sender.full_name || 'Unknown',
      messages.find(m => m.sender.id === recipientId || m.recipient.id === recipientId)?.recipient.full_name || 
      messages.find(m => m.sender.id === recipientId)?.sender.full_name || 'Unknown',
    ];

    setSelectedThread({ messages: threadMessages, participants });
    setDialogOpen(true);
  };

  const filteredMessages = messages.filter(m => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      m.content.toLowerCase().includes(query) ||
      m.sender.full_name.toLowerCase().includes(query) ||
      m.recipient.full_name.toLowerCase().includes(query)
    );
  });

  // Group messages by conversation for summary view
  const getUniqueConversations = () => {
    const conversationMap = new Map<string, MessageWithProfiles>();
    
    filteredMessages.forEach(m => {
      const key = [m.sender.id, m.recipient.id].sort().join('-');
      const existing = conversationMap.get(key);
      if (!existing || new Date(m.created_at) > new Date(existing.created_at)) {
        conversationMap.set(key, m);
      }
    });

    return Array.from(conversationMap.values());
  };

  const uniqueConversations = getUniqueConversations();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-serif">Messages Oversight</h1>
            <p className="text-muted-foreground">Read-only view of all private messages for governance</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Private Conversations
                </CardTitle>
                <CardDescription>
                  {uniqueConversations.length} unique conversations • {messages.length} total messages
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages..."
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : uniqueConversations.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                No private messages found
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Participants</TableHead>
                    <TableHead>Last Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uniqueConversations.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            <Avatar className="h-8 w-8 border-2 border-background">
                              <AvatarImage src={m.sender.avatar_url || undefined} />
                              <AvatarFallback>{m.sender.full_name?.charAt(0) || '?'}</AvatarFallback>
                            </Avatar>
                            <Avatar className="h-8 w-8 border-2 border-background">
                              <AvatarImage src={m.recipient.avatar_url || undefined} />
                              <AvatarFallback>{m.recipient.full_name?.charAt(0) || '?'}</AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{m.sender.full_name}</span>
                            <span className="text-xs text-muted-foreground">↔ {m.recipient.full_name}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="truncate text-sm text-muted-foreground">
                          {m.content.replace(/<[^>]*>/g, '').slice(0, 100)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.is_read ? 'secondary' : 'default'}>
                          {m.is_read ? 'Read' : 'Unread'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(m.created_at), 'PP')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewConversation(m.sender.id, m.recipient.id)}
                          className="gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Conversation Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Conversation Thread</DialogTitle>
              <DialogDescription>
                {selectedThread?.participants.join(' ↔ ')}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {selectedThread?.messages.map((m) => (
                  <div key={m.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={m.sender.avatar_url || undefined} />
                      <AvatarFallback>{m.sender.full_name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{m.sender.full_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {m.sender.role}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(m.created_at), 'PPp')}
                        </span>
                      </div>
                      <div 
                        className="text-sm bg-muted/50 rounded-lg p-3"
                        dangerouslySetInnerHTML={{ __html: m.content }}
                      />
                      {m.attachment_url && (
                        <a
                          href={m.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          📎 {m.attachment_name || 'Attachment'}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminMessagesOversight;

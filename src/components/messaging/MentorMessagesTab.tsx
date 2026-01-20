import { useState, useEffect, useRef } from 'react';
import { usePrivateMessages, useConversation, ConversationPartner, MentorForMessaging } from '@/hooks/usePrivateMessages';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  MessageCircle, 
  Send, 
  Search, 
  PlusCircle, 
  ArrowLeft,
  Users,
  Loader2 
} from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';

export const MentorMessagesTab = () => {
  const { user } = useAuth();
  const { conversations, conversationsLoading, availableMentors, refetchConversations } = usePrivateMessages();
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newConversationOpen, setNewConversationOpen] = useState(false);

  // Find selected partner details
  const selectedPartner = conversations.find(c => c.partner_id === selectedPartnerId);

  // Filter conversations by search
  const filteredConversations = conversations.filter(c =>
    c.partner_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('private-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          refetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetchConversations]);

  const handleSelectConversation = (partnerId: string) => {
    setSelectedPartnerId(partnerId);
  };

  const handleStartConversation = (mentor: MentorForMessaging) => {
    setSelectedPartnerId(mentor.id);
    setNewConversationOpen(false);
  };

  const handleBack = () => {
    setSelectedPartnerId(null);
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Messages
          </CardTitle>
          <Dialog open={newConversationOpen} onOpenChange={setNewConversationOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                New Message
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start New Conversation</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground mb-4">
                Select a mentor to start a private conversation.
              </p>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {availableMentors.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No other mentors available
                    </p>
                  ) : (
                    availableMentors.map((mentor) => (
                      <button
                        key={mentor.id}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                        onClick={() => handleStartConversation(mentor)}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={mentor.avatar_url || undefined} />
                          <AvatarFallback>
                            {mentor.full_name?.charAt(0) || 'M'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{mentor.full_name || 'Mentor'}</p>
                          <p className="text-xs text-muted-foreground capitalize">{mentor.role}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="flex-1 p-0 overflow-hidden">
        <div className="flex h-full">
          {/* Conversation List (hidden on mobile when conversation selected) */}
          <div className={cn(
            "w-full md:w-80 border-r flex flex-col",
            selectedPartnerId ? "hidden md:flex" : "flex"
          )}>
            {/* Search */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            {/* Conversation List */}
            <ScrollArea className="flex-1">
              {conversationsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No conversations found' : 'No messages yet'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start a conversation with another mentor
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map((conv) => (
                    <ConversationItem
                      key={conv.partner_id}
                      conversation={conv}
                      isSelected={selectedPartnerId === conv.partner_id}
                      onClick={() => handleSelectConversation(conv.partner_id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Message Thread */}
          <div className={cn(
            "flex-1 flex flex-col",
            !selectedPartnerId ? "hidden md:flex" : "flex"
          )}>
            {selectedPartnerId ? (
              <MessageThread
                partnerId={selectedPartnerId}
                partnerName={selectedPartner?.partner_name || 'Mentor'}
                partnerAvatar={selectedPartner?.partner_avatar}
                onBack={handleBack}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Conversation list item
const ConversationItem = ({
  conversation,
  isSelected,
  onClick,
}: {
  conversation: ConversationPartner;
  isSelected: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      className={cn(
        "w-full flex items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors",
        isSelected && "bg-muted"
      )}
      onClick={onClick}
    >
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={conversation.partner_avatar || undefined} />
        <AvatarFallback>
          {conversation.partner_name?.charAt(0) || 'M'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium truncate">{conversation.partner_name || 'Mentor'}</p>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: false })}
          </span>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {conversation.last_message_content}
        </p>
      </div>
      {conversation.unread_count > 0 && (
        <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs flex-shrink-0">
          {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
        </Badge>
      )}
    </button>
  );
};

// Message thread component
const MessageThread = ({
  partnerId,
  partnerName,
  partnerAvatar,
  onBack,
}: {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null | undefined;
  onBack: () => void;
}) => {
  const { user } = useAuth();
  const { messages, messagesLoading, sendMessage, markAsRead, refetchMessages } = useConversation(partnerId);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mark messages as read when viewing conversation
  useEffect(() => {
    markAsRead.mutate();
  }, [partnerId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`conversation-${partnerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
        },
        (payload) => {
          const msg = payload.new as any;
          if (
            (msg.sender_id === user.id && msg.recipient_id === partnerId) ||
            (msg.sender_id === partnerId && msg.recipient_id === user.id)
          ) {
            refetchMessages();
            if (msg.sender_id === partnerId) {
              markAsRead.mutate();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, partnerId, refetchMessages, markAsRead]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    
    sendMessage.mutate(
      { recipientId: partnerId, content: newMessage },
      {
        onSuccess: () => {
          setNewMessage('');
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarImage src={partnerAvatar || undefined} />
          <AvatarFallback>{partnerName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{partnerName}</p>
          <p className="text-xs text-muted-foreground">Mentor</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messagesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <p className="text-center">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.is_own_message ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-lg px-4 py-2",
                    msg.is_own_message
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className={cn(
                    "text-xs mt-1",
                    msg.is_own_message ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    {formatMessageDate(msg.created_at)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Textarea
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[40px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sendMessage.isPending}
            size="icon"
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </>
  );
};

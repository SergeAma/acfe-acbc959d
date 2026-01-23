import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ConversationPartner {
  partner_id: string;
  partner_name: string | null;
  partner_avatar: string | null;
  partner_role: string;
  last_message_at: string;
  last_message_content: string;
  unread_count: number;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  attachment_url: string | null;
  attachment_name: string | null;
  is_read: boolean;
  created_at: string;
  is_own_message: boolean;
}

export interface MentorForMessaging {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

export const usePrivateMessages = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all conversation partners
  const { data: conversations = [], isLoading: conversationsLoading, refetch: refetchConversations } = useQuery({
    queryKey: ['conversation-partners', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .rpc('get_conversation_partners', { _user_id: user.id });
      
      if (error) throw error;
      return (data || []) as ConversationPartner[];
    },
    enabled: !!user,
    staleTime: 10000, // 10 seconds
  });

  // Fetch available mentors for starting new conversations
  const { data: availableMentors = [], isLoading: mentorsLoading } = useQuery({
    queryKey: ['available-mentors-for-messaging', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Get all mentors except current user
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .eq('role', 'mentor')
        .eq('account_status', 'active')
        .neq('id', user.id)
        .order('full_name');
      
      if (error) throw error;
      return (data || []) as MentorForMessaging[];
    },
    enabled: !!user,
    staleTime: 60000, // 1 minute
  });

  // Total unread count
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return {
    conversations,
    conversationsLoading,
    refetchConversations,
    availableMentors,
    mentorsLoading,
    totalUnread,
  };
};

export const useConversation = (partnerId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch messages for a specific conversation
  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ['conversation-messages', user?.id, partnerId],
    queryFn: async () => {
      if (!user || !partnerId) return [];
      
      const { data, error } = await supabase
        .rpc('get_conversation_messages', { 
          _user_id: user.id, 
          _partner_id: partnerId 
        });
      
      if (error) throw error;
      return (data || []) as Message[];
    },
    enabled: !!user && !!partnerId,
    staleTime: 5000, // 5 seconds
  });

  // Send a message
  const sendMessage = useMutation({
    mutationFn: async ({ recipientId, content }: { recipientId: string; content: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('private_messages')
        .insert({
          sender_id: user.id,
          recipient_id: recipientId,
          content: content.trim(),
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Trigger email and in-app notification via edge function
      // Notification creation is now handled server-side for reliability
      try {
        await supabase.functions.invoke('send-private-message-notification', {
          body: { messageId: data.id },
        });
      } catch (e) {
        // Non-blocking - notification is best effort
        console.error('Failed to send notification:', e);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', user?.id, partnerId] });
      queryClient.invalidateQueries({ queryKey: ['conversation-partners', user?.id] });
    },
    onError: (error: any) => {
      console.error('Failed to send message:', error);
      if (error.message?.includes('violates row-level security')) {
        toast.error('You cannot send messages to this user. Only mentor-to-mentor messaging is allowed.');
      } else {
        toast.error('Failed to send message. Please try again.');
      }
    },
  });

  // Mark messages as read
  const markAsRead = useMutation({
    mutationFn: async () => {
      if (!user || !partnerId) return;
      
      const { error } = await supabase
        .from('private_messages')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('sender_id', partnerId)
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-partners', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['pending-notifications', user?.id] });
    },
  });

  return {
    messages,
    messagesLoading,
    refetchMessages,
    sendMessage,
    markAsRead,
  };
};

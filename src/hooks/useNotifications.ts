import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  link: string | null;
  action_type: string;
  action_reference_id: string | null;
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();

  // Query pending_notifications view - only shows incomplete actions
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['pending-notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('pending_notifications' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as unknown as Notification[];
    },
    enabled: !!user,
    staleTime: 30000, // 30 seconds
  });

  // All notifications in the view are pending actions
  const pendingCount = notifications.length;

  return {
    notifications,
    pendingCount,
    isLoading,
    refetch,
  };
};

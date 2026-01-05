import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef } from 'react';

export const useClaimInstitutionInvitation = (institutionId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasAttempted = useRef(false);

  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!user || !institutionId) return false;
      
      const { data, error } = await supabase.rpc('claim_institution_invitation', {
        _user_id: user.id,
        _institution_id: institutionId
      });
      
      if (error) throw error;
      return data as boolean;
    },
    onSuccess: (claimed) => {
      if (claimed) {
        // Invalidate queries to refresh membership status
        queryClient.invalidateQueries({ queryKey: ['institution-membership'] });
        queryClient.invalidateQueries({ queryKey: ['user-institutions'] });
      }
    },
  });

  // Automatically attempt to claim when user and institution are available
  useEffect(() => {
    if (user && institutionId && !hasAttempted.current && !claimMutation.isPending) {
      hasAttempted.current = true;
      claimMutation.mutate();
    }
  }, [user, institutionId, claimMutation]);

  // Reset the attempt flag when institution changes
  useEffect(() => {
    hasAttempted.current = false;
  }, [institutionId]);

  return claimMutation;
};

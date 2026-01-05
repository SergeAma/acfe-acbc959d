import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef, useCallback } from 'react';

export const useClaimInstitutionInvitation = (institutionId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasAttempted = useRef(false);

  const claimMutation = useMutation({
    mutationFn: async ({ userId, instId }: { userId: string; instId: string }) => {
      console.log('[ClaimInvitation] Attempting to claim invitation', { userId, instId });
      
      const { data, error } = await supabase.rpc('claim_institution_invitation', {
        _user_id: userId,
        _institution_id: instId
      });
      
      if (error) {
        console.error('[ClaimInvitation] Error claiming invitation:', error);
        throw error;
      }
      
      console.log('[ClaimInvitation] Claim result:', data);
      return data as boolean;
    },
    onSuccess: (claimed) => {
      console.log('[ClaimInvitation] Success, claimed:', claimed);
      if (claimed) {
        // Invalidate queries to refresh membership status
        queryClient.invalidateQueries({ queryKey: ['institution-membership'] });
        queryClient.invalidateQueries({ queryKey: ['user-institutions'] });
      }
    },
    onError: (error) => {
      console.error('[ClaimInvitation] Mutation error:', error);
    }
  });

  const attemptClaim = useCallback(() => {
    if (user && institutionId && !hasAttempted.current && !claimMutation.isPending) {
      console.log('[ClaimInvitation] Triggering claim attempt');
      hasAttempted.current = true;
      claimMutation.mutate({ userId: user.id, instId: institutionId });
    }
  }, [user, institutionId, claimMutation.isPending]);

  // Automatically attempt to claim when user and institution are available
  useEffect(() => {
    attemptClaim();
  }, [attemptClaim]);

  // Reset the attempt flag when institution changes
  useEffect(() => {
    hasAttempted.current = false;
  }, [institutionId]);

  return claimMutation;
};

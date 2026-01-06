import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useLearnerAgreement() {
  const { user, profile } = useAuth();
  const [hasSignedAgreement, setHasSignedAgreement] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if profile is complete (has full_name)
  const isProfileComplete = !!profile?.full_name;

  useEffect(() => {
    const checkAgreement = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Admins and mentors don't need to sign learner agreement
      if (profile?.role === 'admin' || profile?.role === 'mentor') {
        setHasSignedAgreement(true);
        setIsLoading(false);
        return;
      }

      // If profile is incomplete, don't check agreement yet
      if (!isProfileComplete) {
        setHasSignedAgreement(null);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('learner_agreements')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        setHasSignedAgreement(!!data);
      } catch (error) {
        console.error("Error checking learner agreement:", error);
        setHasSignedAgreement(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAgreement();
  }, [user, profile?.role, isProfileComplete]);

  return { hasSignedAgreement, isLoading, isProfileComplete };
}

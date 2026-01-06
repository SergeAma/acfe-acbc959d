import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useMentorContract(userId: string | undefined) {
  const [hasSignedContract, setHasSignedContract] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkContract = async () => {
      if (!userId) {
        setHasSignedContract(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('mentor_contracts')
          .select('id')
          .eq('mentor_id', userId)
          .maybeSingle();

        if (error) throw error;
        setHasSignedContract(!!data);
      } catch (error) {
        console.error("Error checking mentor contract:", error);
        setHasSignedContract(false);
      } finally {
        setLoading(false);
      }
    };

    checkContract();
  }, [userId]);

  return { hasSignedContract, loading };
}

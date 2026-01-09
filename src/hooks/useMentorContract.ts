import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MentorContractData {
  id: string;
  signature_name: string;
  signature_date: string;
  created_at: string;
  requires_resign: boolean;
}

export function useMentorContract(userId: string | undefined) {
  const [hasSignedContract, setHasSignedContract] = useState<boolean | null>(null);
  const [contractData, setContractData] = useState<MentorContractData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkContract = async () => {
      if (!userId) {
        setHasSignedContract(null);
        setContractData(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('mentor_contracts')
          .select('id, signature_name, signature_date, created_at, requires_resign')
          .eq('mentor_id', userId)
          .maybeSingle();

        if (error) throw error;
        
        // Contract is valid only if it exists AND doesn't require re-signing
        const isValid = !!data && !data.requires_resign;
        setHasSignedContract(isValid);
        setContractData(data);
      } catch (error) {
        console.error("Error checking mentor contract:", error);
        setHasSignedContract(false);
        setContractData(null);
      } finally {
        setLoading(false);
      }
    };

    checkContract();
  }, [userId]);

  return { hasSignedContract, contractData, loading };
}

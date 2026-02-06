import { supabase } from "@/integrations/supabase/client";

/**
 * Centralized edge function caller with automatic token refresh
 * DO NOT call edge functions directly - always use this wrapper
 */
export async function callEdgeFunction<T = any>(
  functionName: string,
  payload?: Record<string, any>
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke<T>(functionName, {
      body: payload || {}
    });
    
    if (error) {
      console.error(`Edge function ${functionName} failed:`, error);
      throw error;
    }
    
    return { data, error: null };
  } catch (error) {
    console.error(`Edge function ${functionName} exception:`, error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

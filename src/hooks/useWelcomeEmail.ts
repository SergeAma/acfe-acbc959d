import { supabase } from "@/integrations/supabase/client";

interface SendWelcomeEmailParams {
  userId: string;
  userEmail: string;
  fullName: string;
  preferredLanguage?: string;
  role?: string;
  wantsMentor?: boolean;
}

/**
 * Hook to send welcome emails after agreement acceptance.
 * Uses the send-welcome-email edge function which is publicly callable
 * and handles service role authentication internally.
 * 
 * Ensures emails are only sent once by checking welcome_email_sent_at.
 */
export function useWelcomeEmail() {
  const sendWelcomeEmail = async ({
    userId,
    userEmail,
    fullName,
    preferredLanguage = 'en',
    role = 'student',
    wantsMentor = false
  }: SendWelcomeEmailParams): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('[WelcomeEmail] Starting for user:', userId);
      
      // Check if welcome email was already sent
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('welcome_email_sent_at')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('[WelcomeEmail] Failed to check profile:', fetchError);
        return { success: false, error: fetchError.message };
      }

      // Skip if already sent
      if (profile?.welcome_email_sent_at) {
        console.log('[WelcomeEmail] Already sent, skipping');
        return { success: true };
      }

      console.log('[WelcomeEmail] Invoking send-welcome-email function');
      
      // Use send-welcome-email function which is publicly callable
      // and handles service role authentication internally
      const { data, error } = await supabase.functions.invoke('send-welcome-email', {
        body: {
          email: userEmail,
          first_name: fullName || userEmail.split('@')[0],
          role: role === 'mentor' ? 'mentor' : 'student',
          wants_mentor: wantsMentor,
          user_id: userId,
          preferred_language: preferredLanguage
        }
      });

      if (error) {
        console.error('[WelcomeEmail] Edge function error:', error);
        return { success: false, error: error.message };
      }

      console.log('[WelcomeEmail] Edge function response:', data);

      // Mark as sent in database (prevents duplicates)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ welcome_email_sent_at: new Date().toISOString() })
        .eq('id', userId);

      if (updateError) {
        console.warn('[WelcomeEmail] Failed to update sent timestamp:', updateError);
      }

      console.log('[WelcomeEmail] Welcome email sent successfully');
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[WelcomeEmail] Unexpected error:', error);
      return { success: false, error: message };
    }
  };

  return { sendWelcomeEmail };
}

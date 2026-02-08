import { supabase } from "@/integrations/supabase/client";

interface SendWelcomeEmailParams {
  userId: string;
  userEmail: string;
  fullName: string;
  preferredLanguage?: string;
  role?: string;
}

/**
 * Hook to send welcome emails after agreement acceptance.
 * Ensures emails are only sent once by checking welcome_email_sent_at.
 */
export function useWelcomeEmail() {
  const sendWelcomeEmail = async ({
    userId,
    userEmail,
    fullName,
    preferredLanguage = 'en',
    role = 'student'
  }: SendWelcomeEmailParams): Promise<{ success: boolean; error?: string }> => {
    try {
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

      // Send welcome email to user
      const welcomeResult = await supabase.functions.invoke('send-email', {
        body: {
          type: 'welcome',
          to: userEmail,
          data: {
            userName: fullName || userEmail,
            userEmail: userEmail
          },
          userId: userId,
          language: preferredLanguage
        }
      });

      if (welcomeResult.error) {
        console.warn('[WelcomeEmail] Welcome email failed:', welcomeResult.error);
      }

      // Send admin notification
      const adminResult = await supabase.functions.invoke('send-email', {
        body: {
          type: 'admin-new-student',
          to: 'serge@acloudforeveryone.org',
          data: {
            studentName: fullName || userEmail,
            studentEmail: userEmail,
            role: role,
            signupDate: new Date().toISOString().replace('T', ' ').substring(0, 19)
          },
          language: 'en'
        }
      });

      if (adminResult.error) {
        console.warn('[WelcomeEmail] Admin notification failed:', adminResult.error);
      }

      // Mark as sent in database (prevents duplicates)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ welcome_email_sent_at: new Date().toISOString() })
        .eq('id', userId);

      if (updateError) {
        console.warn('[WelcomeEmail] Failed to update sent timestamp:', updateError);
      }

      console.log('[WelcomeEmail] Welcome emails sent successfully');
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[WelcomeEmail] Unexpected error:', error);
      return { success: false, error: message };
    }
  };

  return { sendWelcomeEmail };
}

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Recipient {
  id: string;
  email: string;
  first_name: string;
}

interface BroadcastRequest {
  broadcast_id: string;
  recipients: Recipient[];
  subject: string;
  html_content: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const { broadcast_id, recipients, subject, html_content }: BroadcastRequest = await req.json();

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipients provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Send emails sequentially with delay to respect Resend rate limits
    // Resend free tier: 2 emails/second, paid: 10 emails/second
    // Using 600ms delay ensures we stay under 2/second limit
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      
      try {
        // Personalize content
        const personalizedHtml = html_content.replace(/\{\{first_name\}\}/g, recipient.first_name);

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "ACFE <noreply@acloudforeveryone.org>",
            to: [recipient.email],
            subject,
            html: personalizedHtml,
          }),
        });

        if (res.ok) {
          sent++;
          // Update recipient record
          await supabase
            .from('broadcast_recipients')
            .update({ email_sent: true })
            .eq('broadcast_id', broadcast_id)
            .eq('recipient_id', recipient.id);
        } else {
          failed++;
          const error = await res.text();
          errors.push(`${recipient.email}: ${error}`);
          console.error(`Failed to send to ${recipient.email}:`, error);
        }
      } catch (err: unknown) {
        failed++;
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`${recipient.email}: ${errorMessage}`);
        console.error(`Error sending to ${recipient.email}:`, errorMessage);
      }

      // Rate limit delay: 600ms between emails (stays under 2/second)
      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    }

    return new Response(
      JSON.stringify({ sent, failed, errors: errors.slice(0, 10) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in send-broadcast:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);

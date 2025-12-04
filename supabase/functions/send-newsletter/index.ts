import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Recipient {
  email: string;
  first_name: string | null;
  last_name: string | null;
  contact_id: string;
}

interface NewsletterRequest {
  recipients: Recipient[];
  subject: string;
  html_content: string;
  template_id: string;
}

const replaceVariables = (content: string, recipient: Recipient): string => {
  let result = content;
  result = result.replace(/\{\{first_name\}\}/gi, recipient.first_name || 'Subscriber');
  result = result.replace(/\{\{last_name\}\}/gi, recipient.last_name || '');
  result = result.replace(/\{\{email\}\}/gi, recipient.email);
  result = result.replace(/\{\{name\}\}/gi, `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim() || 'Subscriber');
  return result;
};

const addTrackingPixel = (content: string, logId: string, supabaseUrl: string): string => {
  const trackingPixelUrl = `${supabaseUrl}/functions/v1/email-tracking/open?id=${logId}`;
  const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;visibility:hidden;" alt="" />`;
  
  // Insert tracking pixel before closing body tag, or at the end
  if (content.includes('</body>')) {
    return content.replace('</body>', `${trackingPixel}</body>`);
  }
  return content + trackingPixel;
};

const wrapLinksWithTracking = (content: string, logId: string, supabaseUrl: string): string => {
  const trackingBaseUrl = `${supabaseUrl}/functions/v1/email-tracking/click?id=${logId}&url=`;
  
  // Match href attributes in anchor tags (but not tracking pixels or unsubscribe)
  const linkRegex = /<a\s+([^>]*href=["'])([^"'#][^"']*)["']([^>]*)>/gi;
  
  return content.replace(linkRegex, (match, before, url, after) => {
    // Skip if it's already a tracking URL or an anchor link
    if (url.includes('email-tracking') || url.startsWith('#') || url.includes('unsubscribe')) {
      return match;
    }
    const encodedUrl = encodeURIComponent(url);
    return `<a ${before}${trackingBaseUrl}${encodedUrl}"${after}>`;
  });
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Newsletter send function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { recipients, subject, html_content, template_id }: NewsletterRequest = await req.json();

    console.log(`Sending newsletter to ${recipients.length} recipients with tracking enabled`);

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Send emails in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (recipient) => {
        try {
          const personalizedContent = replaceVariables(html_content, recipient);
          const personalizedSubject = replaceVariables(subject, recipient);

          // First create the email log to get the ID for tracking
          const { data: logData, error: logError } = await supabase
            .from('email_logs')
            .insert({
              contact_id: recipient.contact_id,
              template_id: template_id,
              subject: personalizedSubject,
              status: 'pending',
            })
            .select('id')
            .single();

          if (logError || !logData) {
            throw new Error(`Failed to create email log: ${logError?.message}`);
          }

          const logId = logData.id;
          console.log(`Created email log with ID: ${logId} for ${recipient.email}`);

          // Add tracking pixel and wrap links
          let trackedContent = addTrackingPixel(personalizedContent, logId, supabaseUrl);
          trackedContent = wrapLinksWithTracking(trackedContent, logId, supabaseUrl);

          const emailResponse = await resend.emails.send({
            from: "A Cloud for Everyone <newsletter@resend.dev>",
            to: [recipient.email],
            subject: personalizedSubject,
            html: trackedContent,
          });

          console.log(`Email sent to ${recipient.email}:`, emailResponse);

          // Update the log status to sent
          await supabase
            .from('email_logs')
            .update({ 
              status: 'sent',
              sent_at: new Date().toISOString()
            })
            .eq('id', logId);

          results.sent++;
        } catch (error: any) {
          console.error(`Failed to send to ${recipient.email}:`, error);
          
          // Log the failed email
          await supabase.from('email_logs').insert({
            contact_id: recipient.contact_id,
            template_id: template_id,
            subject: subject,
            status: 'failed',
            error_message: error.message,
            sent_at: new Date().toISOString()
          });

          results.failed++;
          results.errors.push(`${recipient.email}: ${error.message}`);
        }
      }));

      // Small delay between batches to respect rate limits
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log("Newsletter send complete:", results);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-newsletter function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

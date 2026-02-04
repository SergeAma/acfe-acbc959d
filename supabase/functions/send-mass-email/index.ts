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
  first_name: string;
  last_name: string;
  company: string;
}

interface MassEmailRequest {
  recipients: Recipient[];
  subject: string;
  html_content: string;
  campaign_name: string;
}

const verifyAdminRole = async (req: Request): Promise<{ isAdmin: boolean; userId: string | null; error?: string }> => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { isAdmin: false, userId: null, error: 'Missing authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  // Create service role client and verify JWT token directly
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
  if (authError || !user) {
    console.error("Auth error:", authError);
    return { isAdmin: false, userId: null, error: 'Invalid or expired token' };
  }

  const { data: roleData, error: roleError } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (roleError || !roleData) {
    return { isAdmin: false, userId: user.id, error: 'User is not an admin' };
  }

  return { isAdmin: true, userId: user.id };
};

const replaceVariables = (content: string, recipient: Recipient): string => {
  let result = content;
  result = result.replace(/\{\{first_name\}\}/gi, recipient.first_name || '');
  result = result.replace(/\{\{last_name\}\}/gi, recipient.last_name || '');
  result = result.replace(/\{\{email\}\}/gi, recipient.email);
  result = result.replace(/\{\{company\}\}/gi, recipient.company || '');
  result = result.replace(/\{\{company_name\}\}/gi, recipient.company || '');
  result = result.replace(/\{\{name\}\}/gi, `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim());
  return result;
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Mass email send function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { isAdmin, error: authError } = await verifyAdminRole(req);
  if (!isAdmin) {
    console.error("Authorization failed:", authError);
    return new Response(
      JSON.stringify({ error: authError || 'Unauthorized' }),
      { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { recipients, subject, html_content, campaign_name }: MassEmailRequest = await req.json();

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No recipients provided' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!subject || !html_content || !campaign_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: subject, html_content, campaign_name' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Admin authorized. Sending mass email "${campaign_name}" to ${recipients.length} recipients`);

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process in batches of 10 to respect Resend rate limits
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (recipient) => {
        try {
          const personalizedContent = replaceVariables(html_content, recipient);
          const personalizedSubject = replaceVariables(subject, recipient);

          const emailResponse = await resend.emails.send({
            from: "Serge - ACFE <serge@acloudforeveryone.org>",
            reply_to: "serge@acloudforeveryone.org",
            to: [recipient.email],
            subject: personalizedSubject,
            html: personalizedContent,
          });

          console.log(`Email sent to ${recipient.email}:`, emailResponse);

          // Log to email_logs with campaign_name (contact_id is null for external recipients)
          await supabase.from('email_logs').insert({
            contact_id: null,
            template_id: null,
            subject: personalizedSubject,
            status: 'sent',
            sent_at: new Date().toISOString(),
            campaign_name: campaign_name,
          });

          results.sent++;
        } catch (error: any) {
          console.error(`Failed to send to ${recipient.email}:`, error);
          
          await supabase.from('email_logs').insert({
            contact_id: null,
            template_id: null,
            subject: subject,
            status: 'failed',
            error_message: error.message,
            sent_at: new Date().toISOString(),
            campaign_name: campaign_name,
          });

          results.failed++;
          results.errors.push(`${recipient.email}: ${error.message}`);
        }
      }));

      // Rate limit delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log("Mass email send complete:", results);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-mass-email function:", error);
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

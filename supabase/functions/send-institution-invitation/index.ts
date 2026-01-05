import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  institutionId: string;
  emails: string[];
  institutionName: string;
  institutionSlug: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify admin role
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: hasAdminRole } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!hasAdminRole) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { institutionId, emails, institutionName, institutionSlug } = await req.json() as InvitationRequest;

    if (!institutionId || !emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid request data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const email of emails) {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        errors.push(`Invalid email: ${email}`);
        continue;
      }

      // Check if already invited
      const { data: existing } = await supabaseClient
        .from('institution_students')
        .select('id, status')
        .eq('institution_id', institutionId)
        .eq('email', normalizedEmail)
        .single();

      if (existing && existing.status !== 'revoked') {
        errors.push(`Already invited: ${email}`);
        continue;
      }

      // Insert or update the invitation
      if (existing) {
        await supabaseClient
          .from('institution_students')
          .update({ status: 'pending', invited_at: new Date().toISOString(), invited_by: user.id })
          .eq('id', existing.id);
      } else {
        const { error: insertError } = await supabaseClient
          .from('institution_students')
          .insert({
            institution_id: institutionId,
            email: normalizedEmail,
            status: 'pending',
            invited_by: user.id,
          });

        if (insertError) {
          errors.push(`Failed to invite: ${email}`);
          continue;
        }
      }

      // Send invitation email
      if (resendApiKey) {
        try {
          const careerCentreUrl = `https://acloudforeveryone.org/career-centre/${institutionSlug}`;
          
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "ACFE <noreply@acloudforeveryone.org>",
              to: [normalizedEmail],
              subject: `You're Invited to ${institutionName}'s Career Centre on ACFE`,
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
                    <tr>
                      <td align="center">
                        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                          <tr>
                            <td style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 32px; text-align: center;">
                              <img src="https://acloudforeveryone.org/acfe-logo-email.png" alt="ACFE" style="height: 48px; margin-bottom: 16px;">
                              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Career Centre Invitation</h1>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 32px;">
                              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                                You've been invited to join <strong>${institutionName}</strong>'s exclusive Career Development Centre on A Cloud For Everyone.
                              </p>
                              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                                As a verified student, you'll have access to:
                              </p>
                              <ul style="color: #374151; font-size: 14px; line-height: 1.8; margin: 0 0 24px 0; padding-left: 20px;">
                                <li>Exclusive job opportunities and career resources</li>
                                <li>Co-organized events and professional development programs</li>
                                <li>Direct pathway to Spectrogram Consulting's talent network</li>
                                <li>Private discussions with your institution's community</li>
                              </ul>
                              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                                To get started:
                              </p>
                              <ol style="color: #374151; font-size: 14px; line-height: 1.8; margin: 0 0 24px 0; padding-left: 20px;">
                                <li>Create an ACFE account using this email address</li>
                                <li>Visit your Career Centre at the link below</li>
                                <li>Your access will be automatically verified</li>
                              </ol>
                              <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td align="center" style="padding: 16px 0;">
                                    <a href="${careerCentreUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                                      Access Career Centre
                                    </a>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                              <p style="color: #64748b; font-size: 12px; margin: 0;">
                                © ${new Date().getFullYear()} A Cloud For Everyone. All rights reserved.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
              `,
            }),
          });

          if (emailResponse.ok) {
            sentCount++;
          } else {
            console.error(`Failed to send email to ${email}:`, await emailResponse.text());
          }
        } catch (emailError) {
          console.error(`Email error for ${email}:`, emailError);
        }
      } else {
        // No Resend API key, just count the invitation
        sentCount++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        total: emails.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-institution-invitation:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

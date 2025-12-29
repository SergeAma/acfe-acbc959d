import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface IdeaConfirmationRequest {
  name: string;
  email: string;
  ideaTitle: string;
}

// HTML escape function to prevent injection
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, ideaTitle }: IdeaConfirmationRequest = await req.json();
    
    // Input validation
    if (!name || !email || !ideaTitle) {
      console.error("Missing required fields:", { name: !!name, email: !!email, ideaTitle: !!ideaTitle });
      return new Response(
        JSON.stringify({ error: "Missing required fields: name, email, and ideaTitle are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Length validation
    if (name.length > 100) {
      return new Response(
        JSON.stringify({ error: "Name exceeds maximum length of 100 characters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (ideaTitle.length > 200) {
      return new Response(
        JSON.stringify({ error: "Idea title exceeds maximum length of 200 characters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Email format validation
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // SECURITY: Validate submission exists in database before sending email
    // This prevents abuse by ensuring only legitimate submissions trigger emails
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const { data: submission, error: dbError } = await supabase
      .from('idea_submissions')
      .select('id, email, idea_title, full_name')
      .eq('email', email.trim().toLowerCase())
      .eq('idea_title', ideaTitle.trim())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (dbError) {
      console.error("Database error validating submission:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to validate submission" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (!submission) {
      console.warn("Email confirmation request for non-existent submission:", { email, ideaTitle });
      // Return success to not leak information about existing submissions
      // but don't actually send the email
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Sanitize user inputs for HTML
    const safeName = escapeHtml(name.trim());
    const safeIdeaTitle = escapeHtml(ideaTitle.trim());
    const currentYear = new Date().getFullYear();
    
    console.log(`Sending confirmation email to ${email} for verified idea submission: ${submission.id}`);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
        to: [email],
        subject: "We've Received Your Idea Submission!",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <!-- ACFE Text Header -->
              <div style="text-align: center; margin-bottom: 0; background-color: #3f3f3f; padding: 24px; border-radius: 12px 12px 0 0;">
                <div style="font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: 4px; margin-bottom: 4px;">ACFE</div>
                <div style="font-size: 12px; color: #d4d4d4; letter-spacing: 2px; text-transform: uppercase;">Innovators Incubator</div>
              </div>
              
              <div style="background-color: #ffffff; padding: 32px; border-radius: 0 0 12px 12px;">
                <h1 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 24px;">Thank You, ${safeName}!</h1>
                
                <p style="color: #3f3f46; line-height: 1.6; margin: 0 0 20px 0;">We're excited to let you know that we've received your idea submission:</p>
                
                <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4a5d4a;">
                  <p style="margin: 0;"><strong>Your Idea:</strong> <span style="font-weight: bold; color: #166534;">${safeIdeaTitle}</span></p>
                </div>
                
                <p style="color: #3f3f46; line-height: 1.6; margin: 0 0 16px 0;">Our team is reviewing your submission and we'll be in touch within <strong>7 days</strong> with next steps.</p>
                
                <p style="color: #3f3f46; line-height: 1.6; margin: 0 0 16px 0;">As a reminder, new founders are eligible for up to <strong>$500 in seed funding</strong> from our partner, Spectrogram Consulting.</p>
                
                <p style="color: #3f3f46; line-height: 1.6; margin: 0 0 20px 0;">In the meantime, feel free to explore our courses and resources to help develop your skills further.</p>
                
                <p style="color: #3f3f46; margin: 24px 0 0 0;">
                  Best regards,<br>
                  <strong>The ACFE Team</strong>
                </p>
              </div>
              
              <!-- Footer -->
              <div style="text-align: center; padding: 24px; background-color: #f8f9fa; margin-top: 0;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666;">Building Africa's next generation of tech leaders</p>
                <div style="font-size: 18px; font-weight: 700; color: #3f3f3f; letter-spacing: 2px; margin-bottom: 8px;">ACFE</div>
                <p style="margin: 0; font-size: 12px; color: #71717a;">© ${currentYear} A Cloud for Everyone. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error("Resend API error:", errorData);
      throw new Error("Failed to send email");
    }

    const data = await res.json();
    console.log("Email sent successfully:", data.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending confirmation email:", error.message);
    return new Response(
      JSON.stringify({ error: "Failed to send confirmation email" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

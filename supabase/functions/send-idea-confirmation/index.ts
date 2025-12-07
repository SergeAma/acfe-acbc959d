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
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .logo { font-size: 24px; font-weight: bold; color: #1a1a1a; }
              .content { background: #f9f9f9; border-radius: 12px; padding: 30px; margin-bottom: 30px; }
              .highlight { background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .footer { text-align: center; font-size: 14px; color: #666; }
              h1 { color: #1a1a1a; margin-bottom: 20px; }
              .idea-title { font-weight: bold; color: #2e7d32; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">A Cloud for Everyone</div>
              </div>
              
              <div class="content">
                <h1>Thank You, ${safeName}!</h1>
                
                <p>We're excited to let you know that we've received your idea submission:</p>
                
                <div class="highlight">
                  <p><strong>Your Idea:</strong> <span class="idea-title">${safeIdeaTitle}</span></p>
                </div>
                
                <p>Our team is reviewing your submission and we'll be in touch within <strong>7 days</strong> with next steps.</p>
                
                <p>As a reminder, new founders are eligible for up to <strong>$500 in seed funding</strong> from our partner, Spectrogram Consulting.</p>
                
                <p>In the meantime, feel free to explore our courses and resources to help develop your skills further.</p>
                
                <p>Best regards,<br>
                The A Cloud for Everyone Team</p>
              </div>
              
              <div class="footer">
                <p>Building Africa's next generation of tech leaders</p>
                <p>© ${new Date().getFullYear()} A Cloud for Everyone. All rights reserved.</p>
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

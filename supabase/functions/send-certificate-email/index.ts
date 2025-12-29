import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CertificateEmailRequest {
  student_email: string;
  student_name: string;
  course_name: string;
  mentor_name: string;
  certificate_number: string;
  issued_at: string;
  spectrogram_token?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const {
      student_email,
      student_name,
      course_name,
      mentor_name,
      certificate_number,
      issued_at,
      spectrogram_token,
    }: CertificateEmailRequest = await req.json();

    console.log("Sending certificate email to:", student_email);

    const verificationUrl = "https://acloudforeveryone.org/verify-certificate";
    const certificateUrl = `https://acloudforeveryone.org/certificate/${certificate_number}`;
    const formattedDate = new Date(issued_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Build Spectrogram profile URL if token is provided
    const spectrogramUrl = spectrogram_token 
      ? `https://spectrogramconsulting.com/acfe-callback?token=${spectrogram_token}&email=${encodeURIComponent(student_email)}`
      : null;

    // Send email using Resend API directly
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
        to: [student_email],
        subject: `🎉 Congratulations! You've earned your ${course_name} certificate`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #18181b; margin: 0; font-size: 28px; font-weight: 700;">Congratulations, ${student_name}! 🎓</h1>
              </div>

              <!-- Main Content -->
              <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                  You've successfully completed <strong style="color: #18181b;">${course_name}</strong> and earned your certificate of completion!
                </p>

                <!-- Certificate Preview -->
                <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #86efac; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                  <div style="font-size: 48px; margin-bottom: 12px;">🏆</div>
                  <h2 style="color: #166534; margin: 0 0 8px 0; font-size: 20px;">Certificate of Completion</h2>
                  <p style="color: #15803d; margin: 0; font-size: 14px;">${course_name}</p>
                </div>

                <!-- Details -->
                <div style="background-color: #fafafa; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Certificate ID:</td>
                      <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 600; text-align: right; font-family: monospace;">${certificate_number}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Instructor:</td>
                      <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 600; text-align: right;">${mentor_name}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Issue Date:</td>
                      <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 600; text-align: right;">${formattedDate}</td>
                    </tr>
                  </table>
                </div>

                <!-- Spectrogram CTA -->
                ${spectrogramUrl ? `
                <div style="background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%); border: 2px solid #a5b4fc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                  <h3 style="color: #3730a3; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">🚀 Join the Talent Network</h3>
                  <p style="color: #4338ca; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
                    Create your talent profile on Spectrogram Consulting and get discovered by top recruiters. Your skills and certificate will be pre-filled!
                  </p>
                  <a href="${spectrogramUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">Create My Talent Profile →</a>
                </div>
                ` : ''}

                <!-- CTA Buttons -->
                <div style="text-align: center; margin-bottom: 24px;">
                  <a href="${certificateUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px;">View & Download Certificate</a>
                </div>

                <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
                  Your certificate can be verified by anyone at<br>
                  <a href="${verificationUrl}" style="color: #16a34a;">${verificationUrl}</a>
                </p>
              </div>

              <!-- Footer -->
              <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e4e4e7;">
                <p style="color: #71717a; font-size: 12px; margin: 0 0 8px 0;">
                  © ${new Date().getFullYear()} A Cloud for Everyone. All rights reserved.
                </p>
                <p style="color: #a1a1aa; font-size: 11px; margin: 0;">
                  You received this email because you completed a course on our platform.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Certificate email sent successfully:", emailResult);

    // Log the email
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    
    await adminClient.from("email_logs").insert({
      subject: `Certificate: ${course_name}`,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-certificate-email function:", error);
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

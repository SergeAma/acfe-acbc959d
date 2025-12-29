import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Hardcoded test data
    const student_email = "serge@spectrogramconsulting.com";
    const student_name = "Sergino BUshens";
    const course_name = "Crash Course: How To Get Into Tech With NO Degree & ZERO Experience (Non-technical Career Path)";
    const course_id = "8fc5e28e-631d-42d8-9bb1-d067fbcd26b1";
    const certificate_number = "ACFE-MJRDNUCT-2DTE";
    const issued_at = "2025-12-29T16:33:29.104779+00:00";

    console.log("Sending test certificate email to:", student_email);

    // Fetch mentor name
    const { data: courseData } = await adminClient
      .from('courses')
      .select('mentor_id')
      .eq('id', course_id)
      .single();

    let mentorName = 'Instructor';
    if (courseData?.mentor_id) {
      const { data: mentorData } = await adminClient
        .from('profiles')
        .select('full_name')
        .eq('id', courseData.mentor_id)
        .single();
      if (mentorData?.full_name) {
        mentorName = mentorData.full_name;
      }
    }

    console.log("Mentor name:", mentorName);

    // Text-based ACFE branding for reliable email rendering
    
    const baseUrl = "https://acloudforeveryone.org";
    const verificationUrl = `${baseUrl}/verify-certificate`;
    const certificateUrl = `${baseUrl}/certificate/${certificate_number}`;
    const formattedDate = new Date(issued_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

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
        subject: `🎉 [TEST] Congratulations! You've earned your ${course_name} certificate`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <!-- ACFE Text Header -->
              <div style="text-align: center; margin-bottom: 24px; background-color: #3f3f3f; padding: 24px; border-radius: 12px;">
                <div style="font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: 4px; margin-bottom: 4px;">ACFE</div>
                <div style="font-size: 12px; color: #d4d4d4; letter-spacing: 2px; text-transform: uppercase;">A Cloud for Everyone</div>
              </div>
              
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
                      <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 600; text-align: right;">${mentorName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Issue Date:</td>
                      <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 600; text-align: right;">${formattedDate}</td>
                    </tr>
                  </table>
                </div>

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
                <div style="font-size: 18px; font-weight: 700; color: #3f3f3f; letter-spacing: 2px; margin-bottom: 8px;">ACFE</div>
                <p style="color: #71717a; font-size: 12px; margin: 0 0 8px 0;">
                  © ${new Date().getFullYear()} A Cloud for Everyone. All rights reserved.
                </p>
                <p style="color: #a1a1aa; font-size: 11px; margin: 0;">
                  This is a TEST email to verify the new ACFE logo.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Test certificate email sent:", emailResult);

    return new Response(JSON.stringify({ success: true, result: emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);

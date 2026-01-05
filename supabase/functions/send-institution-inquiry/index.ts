import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-INSTITUTION-INQUIRY] ${step}${detailsStr}`);
};

interface InstitutionInquiryRequest {
  institutionName: string;
  institutionType: string;
  firstName: string;
  lastName: string;
  contactEmail: string;
  contactPhone?: string;
  estimatedStudents?: string;
  message?: string;
  turnstileToken: string;
}

async function verifyTurnstile(token: string): Promise<boolean> {
  const secretKey = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secretKey) {
    logStep("ERROR", { message: "TURNSTILE_SECRET_KEY not configured" });
    return false;
  }

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await response.json();
    logStep("Turnstile verification result", { success: data.success });
    return data.success === true;
  } catch (error) {
    logStep("Turnstile verification error", { error });
    return false;
  }
}

async function sendEmail(to: string[], subject: string, html: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "ACFE Platform <noreply@acloudforeveryone.org>",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const body: InstitutionInquiryRequest = await req.json();
    const { institutionName, institutionType, firstName, lastName, contactEmail, contactPhone, estimatedStudents, message, turnstileToken } = body;
    const contactName = `${firstName} ${lastName}`.trim();

    // Verify CAPTCHA first
    if (!turnstileToken) {
      logStep("Missing CAPTCHA token");
      return new Response(
        JSON.stringify({ error: "Please complete the CAPTCHA verification" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const isCaptchaValid = await verifyTurnstile(turnstileToken);
    if (!isCaptchaValid) {
      logStep("CAPTCHA verification failed");
      return new Response(
        JSON.stringify({ error: "CAPTCHA verification failed. Please try again." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!institutionName || !firstName || !lastName || !contactEmail) {
      throw new Error("Missing required fields: institutionName, firstName, lastName, contactEmail");
    }

    logStep("Sending institution inquiry email", { institutionName, institutionType, contactEmail });

    // Send email to ACFE team
    const acfeEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #7c6f5b 0%, #a69783 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .field { margin-bottom: 20px; }
          .label { font-weight: bold; color: #7c6f5b; margin-bottom: 5px; }
          .value { padding: 10px; background: white; border-radius: 4px; border-left: 3px solid #7c6f5b; }
          .benefits { background: #fff; padding: 20px; border-radius: 8px; margin-top: 20px; }
          .benefits h3 { color: #7c6f5b; margin-top: 0; }
          .benefits ul { padding-left: 20px; }
          .benefits li { margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 New Educational Institution Inquiry</h1>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">Institution Name</div>
              <div class="value">${institutionName}</div>
            </div>
            <div class="field">
              <div class="label">Contact Person</div>
              <div class="value">${contactName}</div>
            </div>
            <div class="field">
              <div class="label">Email Address</div>
              <div class="value"><a href="mailto:${contactEmail}">${contactEmail}</a></div>
            </div>
            ${contactPhone ? `
            <div class="field">
              <div class="label">Phone Number</div>
              <div class="value">${contactPhone}</div>
            </div>
            ` : ''}
            ${estimatedStudents ? `
            <div class="field">
              <div class="label">Estimated Number of Students</div>
              <div class="value">${estimatedStudents}</div>
            </div>
            ` : ''}
            ${message ? `
            <div class="field">
              <div class="label">Additional Message</div>
              <div class="value">${message}</div>
            </div>
            ` : ''}
            
            <div class="benefits">
              <h3>Partnership Benefits Requested:</h3>
              <ul>
                <li><strong>Bespoke Pricing</strong> - Custom pricing tailored to the institution's needs</li>
                <li><strong>Tailored Enablement Events</strong> - Co-organized events for students</li>
                <li><strong>Topic-Driven Mentorship at Scale</strong> - Structured mentorship programs</li>
                <li><strong>Dedicated ACFE Career Centre</strong> - Private career development space for students</li>
                <li><strong>Spectrogram Talent Profiles</strong> - Automatic talent account creation for graduates</li>
              </ul>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail(
      ["contact@acloudforeveryone.org"],
      `Educational Institution Partnership Inquiry: ${institutionName}`,
      acfeEmailHtml
    );
    logStep("ACFE team email sent");

    // Send confirmation email to the institution contact
    const confirmationEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #7c6f5b 0%, #a69783 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .logo { margin-bottom: 10px; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .highlight { background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c6f5b; }
          .benefits { background: #fff; padding: 20px; border-radius: 8px; margin-top: 20px; }
          .benefits h3 { color: #7c6f5b; margin-top: 0; }
          .benefits ul { padding-left: 20px; }
          .benefits li { margin-bottom: 12px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://acloudforeveryone.org/acfe-logo-email.png" alt="ACFE" width="150" class="logo">
            <h1>Partnership Inquiry Received</h1>
          </div>
          <div class="content">
            <p>Dear ${contactName},</p>
            
            <p>Thank you for expressing interest in partnering with <strong>A Cloud For Everyone (ACFE)</strong> on behalf of <strong>${institutionName}</strong>.</p>
            
            <div class="highlight">
              <p><strong>We're excited about the possibility of empowering your students with tech skills and career opportunities!</strong></p>
              <p>A member of our partnerships team will reach out to you within 2-3 business days to discuss how we can tailor our platform to meet your institution's needs.</p>
            </div>
            
            <div class="benefits">
              <h3>What Your Students Will Get:</h3>
              <ul>
                <li><strong>Bespoke Pricing</strong> - Custom pricing structures designed for educational institutions</li>
                <li><strong>Tailored Enablement Events</strong> - Co-organized workshops, hackathons, and career fairs exclusively for your students</li>
                <li><strong>Topic-Driven Mentorship at Scale</strong> - Structured mentorship programs with industry experts matched to your curriculum</li>
                <li><strong>Dedicated ACFE Career Centre</strong> - A private career development space branded for your institution, where students can:
                  <ul>
                    <li>Interact within a gated community dedicated to your institution</li>
                    <li>Apply to exclusive ACFE job opportunities</li>
                    <li>Access upcoming co-organized events and special courses</li>
                  </ul>
                </li>
                <li><strong>Spectrogram Consulting Talent Profiles</strong> - Upon course completion, students automatically get connected to our founding partner's talent network for job opportunities</li>
              </ul>
            </div>
            
            <p>If you have any immediate questions, feel free to reply to this email or contact us at <a href="mailto:contact@acloudforeveryone.org">contact@acloudforeveryone.org</a>.</p>
            
            <p>We look forward to partnering with ${institutionName} to shape the next generation of African tech talent!</p>
            
            <p>Best regards,<br><strong>The ACFE Partnerships Team</strong></p>
            
            <div class="footer">
              <p>A Cloud For Everyone | Empowering African Tech Talent</p>
              <p><a href="https://acloudforeveryone.org">acloudforeveryone.org</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail(
      [contactEmail],
      "Thank you for your interest in ACFE Partnership",
      confirmationEmailHtml
    );
    logStep("Confirmation email sent to institution");

    return new Response(JSON.stringify({ 
      success: true,
      message: "Inquiry submitted successfully" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

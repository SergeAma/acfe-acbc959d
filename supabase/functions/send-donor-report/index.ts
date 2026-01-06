import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Donor {
  email: string;
  firstName: string;
  lastName: string;
}

interface ReportRequest {
  subject: string;
  content: string;
  donors: Donor[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, content, donors }: ReportRequest = await req.json();

    if (!subject || !content || !donors || donors.length === 0) {
      throw new Error("Missing required fields");
    }

    const results = [];

    for (const donor of donors) {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://mefwbcbnctqjxrwldmjm.supabase.co/storage/v1/object/public/email-assets/acfe-logo-email.png" alt="ACFE Logo" style="height: 80px;">
          </div>
          
          <h1 style="color: #4a7c59; text-align: center;">${subject}</h1>
          
          <p>Dear ${donor.firstName},</p>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 12px; margin: 25px 0; white-space: pre-wrap;">
            ${content}
          </div>
          
          <p>Thank you for your continued support!</p>
          
          <p>With gratitude,<br><strong>The ACFE Team</strong></p>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #666; text-align: center;">
            You're receiving this because you're a valued ACFE donor.<br>
            A Cloud For Everyone • Empowering Africa's Tech Career
          </p>
        </body>
        </html>
      `;

      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "A Cloud For Everyone <noreply@acloudforeveryone.org>",
          to: [donor.email],
          subject: subject,
          html: emailHtml,
        }),
      });

      const result = await emailResponse.json();
      results.push({ email: donor.email, result });
    }

    console.log("Donor report emails sent:", results.length);

    return new Response(JSON.stringify({ success: true, sent: results.length }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending donor report:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

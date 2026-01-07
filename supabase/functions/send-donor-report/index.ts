import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildCanonicalEmail, getSubTranslation, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Donor {
  email: string;
  firstName: string;
  lastName: string;
  language?: EmailLanguage;
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
      const displayName = donor.firstName || "Valued Donor";
      const lang: EmailLanguage = donor.language === 'fr' ? 'fr' : 'en';
      
      const greeting = lang === 'fr' ? 'Cher' : 'Dear';
      const signoffText = getSubTranslation('donor.report.signoff', lang);
      const team = lang === 'fr' ? "L'Équipe ACFE" : 'The ACFE Team';

      const emailHtml = buildCanonicalEmail({
        headline: subject,
        body_primary: `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p><div style="white-space: pre-wrap;">${content}</div>`,
        signoff: `${signoffText}<br><strong>${team}</strong>`
      }, lang);

      const { data, error } = await resend.emails.send({
        from: "A Cloud For Everyone <noreply@acloudforeveryone.org>",
        to: [donor.email],
        subject: subject,
        html: emailHtml,
      });

      if (error) {
        console.error(`Error sending to ${donor.email}:`, error);
        results.push({ email: donor.email, error: error.message });
      } else {
        results.push({ email: donor.email, result: data });
      }
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

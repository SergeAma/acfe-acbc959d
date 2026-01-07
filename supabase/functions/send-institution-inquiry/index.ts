import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildCanonicalEmail } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 3;

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  
  record.count++;
  return false;
}

function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

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
      body: new URLSearchParams({ secret: secretKey, response: token }),
    });

    const data = await response.json();
    logStep("Turnstile verification result", { success: data.success });
    return data.success === true;
  } catch (error) {
    logStep("Turnstile verification error", { error });
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const body: InstitutionInquiryRequest = await req.json();
    const { institutionName, institutionType, firstName, lastName, contactEmail, contactPhone, estimatedStudents, message, turnstileToken } = body;

    if (!institutionName || typeof institutionName !== 'string' || institutionName.length > 200) {
      throw new Error("Invalid institution name");
    }
    if (!firstName || typeof firstName !== 'string' || firstName.length > 100) {
      throw new Error("Invalid first name");
    }
    if (!lastName || typeof lastName !== 'string' || lastName.length > 100) {
      throw new Error("Invalid last name");
    }
    if (!contactEmail || typeof contactEmail !== 'string' || contactEmail.length > 255) {
      throw new Error("Invalid email");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = contactEmail.trim().toLowerCase();
    if (!emailRegex.test(trimmedEmail)) {
      throw new Error("Invalid email format");
    }

    const rateLimitKey = `institution:${trimmedEmail}`;
    if (isRateLimited(rateLimitKey)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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

    const safeInstitutionName = escapeHtml(institutionName.trim().substring(0, 200));
    const safeFirstName = escapeHtml(firstName.trim().substring(0, 100));
    const safeLastName = escapeHtml(lastName.trim().substring(0, 100));
    const safeContactName = `${safeFirstName} ${safeLastName}`;
    const safeContactEmail = escapeHtml(trimmedEmail);
    const safeInstitutionType = institutionType ? escapeHtml(institutionType.trim().substring(0, 100)) : '';
    const safeContactPhone = contactPhone ? escapeHtml(contactPhone.trim().substring(0, 50)) : '';
    const safeEstimatedStudents = estimatedStudents ? escapeHtml(estimatedStudents.trim().substring(0, 50)) : '';
    const safeMessage = message ? escapeHtml(message.trim().substring(0, 2000)) : '';

    logStep("Sending institution inquiry email", { institutionName: safeInstitutionName });

    // Email to ACFE team (internal notification - use simple format)
    const acfeEmailHtml = buildCanonicalEmail({
      headline: 'New Educational Institution Inquiry',
      body_primary: `<p>A new institution partnership inquiry has been received.</p>
        <p><strong>Institution:</strong> ${safeInstitutionName}${safeInstitutionType ? ` (${safeInstitutionType})` : ''}</p>
        <p><strong>Contact:</strong> ${safeContactName}</p>
        <p><strong>Email:</strong> ${safeContactEmail}</p>
        ${safeContactPhone ? `<p><strong>Phone:</strong> ${safeContactPhone}</p>` : ''}
        ${safeEstimatedStudents ? `<p><strong>Estimated Students:</strong> ${safeEstimatedStudents}</p>` : ''}
        ${safeMessage ? `<p><strong>Message:</strong> ${safeMessage}</p>` : ''}`,
      impact_block: {
        title: 'Partnership Benefits Requested:',
        items: [
          'Bespoke Pricing - Custom pricing tailored to the institution\'s needs',
          'Tailored Enablement Events - Co-organized events for students',
          'Topic-Driven Mentorship at Scale - Structured mentorship programs',
          'Dedicated ACFE Career Centre - Private career development space',
          'Spectrogram Talent Profiles - Automatic talent account creation for graduates',
        ],
      },
    }, 'en');

    await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: ["contact@acloudforeveryone.org"],
      subject: `Educational Institution Partnership Inquiry: ${safeInstitutionName}`,
      html: acfeEmailHtml,
    });
    logStep("ACFE team email sent");

    // Confirmation email to the institution contact
    const confirmationHtml = buildCanonicalEmail({
      headline: 'Partnership Inquiry Received',
      body_primary: `<p>Dear ${safeContactName},</p>
        <p>Thank you for expressing interest in partnering with <strong>A Cloud For Everyone (ACFE)</strong> on behalf of <strong>${safeInstitutionName}</strong>.</p>
        <p>We're excited about the possibility of empowering your students with tech skills and career opportunities!</p>
        <p>A member of our partnerships team will reach out to you within 2-3 business days to discuss how we can tailor our platform to meet your institution's needs.</p>`,
      impact_block: {
        title: 'What Your Students Will Get:',
        items: [
          'Bespoke Pricing - Custom pricing structures designed for educational institutions',
          'Tailored Enablement Events - Co-organized workshops, hackathons, and career fairs',
          'Topic-Driven Mentorship at Scale - Structured mentorship with industry experts',
          'Dedicated ACFE Career Centre - A private career development space for your students',
          'Spectrogram Talent Profiles - Connection to our founding partner\'s talent network',
        ],
      },
      primary_cta: {
        label: 'Visit Our Platform',
        url: 'https://acloudforeveryone.org',
      },
    }, 'en');

    await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [trimmedEmail],
      subject: "Thank you for your interest in ACFE Partnership",
      html: confirmationHtml,
    });
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

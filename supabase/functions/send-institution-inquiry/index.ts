import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildCanonicalEmail, EmailLanguage } from "../_shared/email-template.ts";

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
  lastName?: string;
  contactEmail: string;
  contactPhone?: string;
  estimatedStudents?: string;
  message?: string;
  turnstileToken: string;
  language?: EmailLanguage;
}

const translations = {
  en: {
    confirmSubject: "Thank you for your interest in ACFE Partnership",
    confirmHeadline: "Partnership Inquiry Received",
    confirmIntro: (name: string, institution: string) => 
      `<p>Dear ${name},</p><p>Thank you for expressing interest in partnering with <strong>A Cloud For Everyone (ACFE)</strong> on behalf of <strong>${institution}</strong>.</p><p>We're excited about the possibility of empowering your students with tech skills and career opportunities!</p><p>A member of our partnerships team will reach out to you within 2-3 business days to discuss how we can tailor our platform to meet your institution's needs.</p>`,
    impactTitle: "What Your Students Will Get:",
    item1: "Bespoke Pricing - Custom pricing structures designed for educational institutions",
    item2: "Tailored Enablement Events - Co-organized workshops, hackathons, and career fairs",
    item3: "Topic-Driven Mentorship at Scale - Structured mentorship with industry experts",
    item4: "Dedicated ACFE Career Centre - A private career development space for your students",
    item5: "Spectrogram Talent Profiles - Connection to our founding partner's talent network",
    cta: "Visit Our Platform",
  },
  fr: {
    confirmSubject: "Merci pour votre intérêt au partenariat ACFE",
    confirmHeadline: "Demande de Partenariat Reçue",
    confirmIntro: (name: string, institution: string) => 
      `<p>Cher ${name},</p><p>Merci d'avoir exprimé votre intérêt pour un partenariat avec <strong>A Cloud For Everyone (ACFE)</strong> au nom de <strong>${institution}</strong>.</p><p>Nous sommes enthousiastes à l'idée d'aider vos étudiants à acquérir des compétences tech et des opportunités de carrière!</p><p>Un membre de notre équipe de partenariats vous contactera dans les 2-3 jours ouvrables pour discuter de la façon dont nous pouvons adapter notre plateforme aux besoins de votre institution.</p>`,
    impactTitle: "Ce Que Vos Étudiants Obtiendront:",
    item1: "Tarification Sur Mesure - Structures tarifaires personnalisées pour les établissements d'enseignement",
    item2: "Événements d'Activation Personnalisés - Ateliers, hackathons et salons de l'emploi co-organisés",
    item3: "Mentorat Thématique à Grande Échelle - Mentorat structuré avec des experts de l'industrie",
    item4: "Centre de Carrière ACFE Dédié - Un espace de développement de carrière privé pour vos étudiants",
    item5: "Profils de Talents Spectrogram - Connexion au réseau de talents de notre partenaire fondateur",
    cta: "Visiter Notre Plateforme",
  },
};

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
    const { institutionName, institutionType, firstName, lastName = '', contactEmail, contactPhone, estimatedStudents, message, turnstileToken, language = 'en' } = body;

    const lang: EmailLanguage = language === 'fr' ? 'fr' : 'en';
    const t = translations[lang];

    if (!institutionName || typeof institutionName !== 'string' || institutionName.length > 200) {
      throw new Error("Invalid institution name");
    }
    if (!firstName || typeof firstName !== 'string' || firstName.length > 100) {
      throw new Error("Invalid name");
    }
    if (lastName && (typeof lastName !== 'string' || lastName.length > 100)) {
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
    const safeLastName = lastName ? escapeHtml(lastName.trim().substring(0, 100)) : '';
    const safeContactName = safeLastName ? `${safeFirstName} ${safeLastName}` : safeFirstName;
    const safeContactEmail = escapeHtml(trimmedEmail);
    const safeInstitutionType = institutionType ? escapeHtml(institutionType.trim().substring(0, 100)) : '';
    const safeContactPhone = contactPhone ? escapeHtml(contactPhone.trim().substring(0, 50)) : '';
    const safeEstimatedStudents = estimatedStudents ? escapeHtml(estimatedStudents.trim().substring(0, 50)) : '';
    const safeMessage = message ? escapeHtml(message.trim().substring(0, 2000)) : '';

    logStep("Sending institution inquiry email", { institutionName: safeInstitutionName });

    // Email to ACFE team (internal notification - always English)
    const acfeEmailHtml = buildCanonicalEmail({
      headline: 'New Educational Institution Inquiry',
      body_primary: `<p>A new institution partnership inquiry has been received.</p>
        <p><strong>Institution:</strong> ${safeInstitutionName}${safeInstitutionType ? ` (${safeInstitutionType})` : ''}</p>
        <p><strong>Contact:</strong> ${safeContactName}</p>
        <p><strong>Email:</strong> ${safeContactEmail}</p>
        ${safeContactPhone ? `<p><strong>Phone:</strong> ${safeContactPhone}</p>` : ''}
        ${safeEstimatedStudents ? `<p><strong>Estimated Students:</strong> ${safeEstimatedStudents}</p>` : ''}
        ${safeMessage ? `<p><strong>Message:</strong> ${safeMessage}</p>` : ''}
        <p><strong>Language Preference:</strong> ${lang.toUpperCase()}</p>`,
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

    // Confirmation email to the institution contact (in their preferred language)
    const confirmationHtml = buildCanonicalEmail({
      headline: t.confirmHeadline,
      body_primary: t.confirmIntro(safeContactName, safeInstitutionName),
      impact_block: {
        title: t.impactTitle,
        items: [t.item1, t.item2, t.item3, t.item4, t.item5],
      },
      primary_cta: {
        label: t.cta,
        url: 'https://acloudforeveryone.org',
      },
    }, lang);

    await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [trimmedEmail],
      subject: t.confirmSubject,
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

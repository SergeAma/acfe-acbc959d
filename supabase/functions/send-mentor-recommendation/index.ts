import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { buildCanonicalEmail, EmailLanguage } from "../_shared/email-template.ts";
import { escapeHtml, escapeUrl } from "../_shared/html-escape.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MentorRecommendation {
  mentor: {
    firstName: string;
    lastName: string;
    company: string;
    linkedinUrl: string;
    email?: string | null;
  };
  recommenderEmail?: string | null;
  captchaToken: string;
}

// Rate limiting map (reusing pattern from submit-referral)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mentor, recommenderEmail, captchaToken }: MentorRecommendation = await req.json();

    // Validate required fields
    if (!mentor?.firstName || typeof mentor.firstName !== 'string' || mentor.firstName.length > 100) {
      throw new Error("Invalid first name");
    }
    if (!mentor?.lastName || typeof mentor.lastName !== 'string' || mentor.lastName.length > 100) {
      throw new Error("Invalid last name");
    }
    if (!mentor?.company || typeof mentor.company !== 'string' || mentor.company.length > 200) {
      throw new Error("Invalid company name");
    }
    if (!mentor?.linkedinUrl || typeof mentor.linkedinUrl !== 'string' || mentor.linkedinUrl.length > 500) {
      throw new Error("Invalid LinkedIn URL");
    }
    if (!mentor.linkedinUrl.includes('linkedin.com')) {
      throw new Error("Please provide a valid LinkedIn profile URL");
    }
    
    // Optional mentor email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (mentor.email && typeof mentor.email === 'string') {
      if (!emailRegex.test(mentor.email.trim()) || mentor.email.length > 255) {
        throw new Error("Invalid mentor email format");
      }
    }
    
    // Optional recommender email validation
    if (recommenderEmail && typeof recommenderEmail === 'string') {
      if (!emailRegex.test(recommenderEmail.trim()) || recommenderEmail.length > 255) {
        throw new Error("Invalid recommender email format");
      }
    }

    if (!captchaToken || typeof captchaToken !== 'string') {
      throw new Error("CAPTCHA verification is required");
    }

    // Rate limiting
    const rateLimitKey = `mentor-rec:${mentor.linkedinUrl.toLowerCase().trim()}`;
    if (isRateLimited(rateLimitKey)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify CAPTCHA
    const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!turnstileSecret) {
      throw new Error("Security configuration error");
    }

    const captchaResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: turnstileSecret,
        response: captchaToken,
      }),
    });

    const captchaResult = await captchaResponse.json();
    if (!captchaResult.success) {
      throw new Error("CAPTCHA verification failed");
    }

    // Sanitize inputs
    const sanitizedMentor = {
      firstName: mentor.firstName.trim().substring(0, 100),
      lastName: mentor.lastName.trim().substring(0, 100),
      company: mentor.company.trim().substring(0, 200),
      linkedinUrl: mentor.linkedinUrl.trim().substring(0, 500),
      email: mentor.email?.trim().substring(0, 255) || null,
    };
    
    const sanitizedRecommenderEmail = recommenderEmail?.trim().substring(0, 255) || null;

    // Send emails using Resend API directly
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      throw new Error("Email service not configured");
    }
    
    const language: EmailLanguage = 'en';

    // 1. Send notification to admin team
    const adminEmailHtml = buildCanonicalEmail({
      headline: "New Mentor Recommendation",
      body_primary: `<p>Someone has recommended the following person as a potential mentor for ACFE:</p>
        <p><strong>Name:</strong> ${escapeHtml(sanitizedMentor.firstName)} ${escapeHtml(sanitizedMentor.lastName)}</p>
        <p><strong>Company:</strong> ${escapeHtml(sanitizedMentor.company)}</p>
        <p><strong>LinkedIn:</strong> <a href="${escapeUrl(sanitizedMentor.linkedinUrl)}">${escapeHtml(sanitizedMentor.linkedinUrl)}</a></p>
        ${sanitizedMentor.email ? `<p><strong>Email:</strong> ${escapeHtml(sanitizedMentor.email)}</p>` : '<p><strong>Email:</strong> <em>Not provided</em></p>'}
        ${sanitizedRecommenderEmail ? `<p><strong>Recommender Email:</strong> ${escapeHtml(sanitizedRecommenderEmail)}</p>` : ''}`,
      primary_cta: sanitizedMentor.linkedinUrl ? {
        label: "View LinkedIn Profile",
        url: sanitizedMentor.linkedinUrl,
      } : undefined,
      signoff: "The ACFE Platform",
    }, language);

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "ACFE <noreply@acloudforeveryone.org>",
        to: ["team@acloudforeveryone.org"],
        subject: `New Mentor Recommendation: ${escapeHtml(sanitizedMentor.firstName)} ${escapeHtml(sanitizedMentor.lastName)}`,
        html: adminEmailHtml,
      }),
    });
    console.log("Admin notification sent");

    // 2. Send confirmation to recommender (if email provided)
    if (sanitizedRecommenderEmail) {
      const recommenderEmailHtml = buildCanonicalEmail({
        headline: "Thank You for Your Recommendation!",
        body_primary: `<p>Thank you for recommending <strong>${escapeHtml(sanitizedMentor.firstName)} ${escapeHtml(sanitizedMentor.lastName)}</strong> from <strong>${escapeHtml(sanitizedMentor.company)}</strong> as a potential mentor for ACFE.</p>
          <p>Our team will review this recommendation and reach out to the candidate. We truly appreciate you helping us grow our mentor community!</p>
          <p>Together, we're building a brighter future for African tech talent.</p>`,
        impact_block: {
          title: "What happens next:",
          items: [
            "Our team will review the recommendation",
            "We'll reach out to the potential mentor",
            "If they join, they'll help guide our learners",
          ],
        },
        primary_cta: {
          label: "Explore ACFE",
          url: "https://acfe.lovable.app",
        },
        signoff: "Warm regards,<br>The ACFE Team",
      }, language);

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "ACFE <noreply@acloudforeveryone.org>",
          to: [sanitizedRecommenderEmail],
          subject: "Thank You for Your Mentor Recommendation",
          html: recommenderEmailHtml,
        }),
      });
      console.log("Recommender confirmation sent to:", sanitizedRecommenderEmail);
    }

    // 3. Send notification to recommended mentor (if email provided)
    if (sanitizedMentor.email) {
      const mentorEmailHtml = buildCanonicalEmail({
        headline: "You've Been Recommended as a Mentor!",
        body_primary: `<p>Hi ${escapeHtml(sanitizedMentor.firstName)},</p>
          <p>Someone who believes in your expertise has anonymously recommended you to join <strong>A Cloud For Everyone (ACFE)</strong> as a mentor.</p>
          <p>ACFE is a nonprofit platform dedicated to empowering young Africans with digital skills. Our mentors play a crucial role in guiding learners through their tech journey, sharing industry insights, and building the next generation of African tech talent.</p>
          <p>We'd love for you to consider joining our mentor community!</p>`,
        impact_block: {
          title: "As an ACFE mentor, you can:",
          items: [
            "Share your expertise through courses and live sessions",
            "Guide passionate learners on their career paths",
            "Connect with a community of like-minded professionals",
            "Make a lasting impact on African tech education",
          ],
        },
        primary_cta: {
          label: "Learn More About ACFE",
          url: "https://acfe.lovable.app/mentors",
        },
        secondary_cta: {
          label: "View Your LinkedIn",
          url: sanitizedMentor.linkedinUrl,
        },
        signoff: "Warm regards,<br>The ACFE Team",
      }, language);

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "ACFE <noreply@acloudforeveryone.org>",
          to: [sanitizedMentor.email],
          subject: "You've Been Recommended as an ACFE Mentor",
          html: mentorEmailHtml,
        }),
      });
      console.log("Mentor notification sent to:", sanitizedMentor.email);
    }

    console.log("Mentor recommendation submitted successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Mentor recommendation error:", error);
    const message = error instanceof Error ? error.message : "Failed to submit recommendation";
    
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);

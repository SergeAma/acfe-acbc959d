import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

// HTML escape function (reusing pattern from submit-referral)
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mentor, captchaToken }: MentorRecommendation = await req.json();

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
    
    // Optional email validation
    if (mentor.email && typeof mentor.email === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(mentor.email.trim()) || mentor.email.length > 255) {
        throw new Error("Invalid email format");
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

    // Verify CAPTCHA (reusing pattern from submit-referral)
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

    // Send notification email (reusing Resend pattern)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
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
          html: `
            <h2>New Mentor Recommendation</h2>
            
            <p>Someone has recommended the following person as a potential mentor for ACFE:</p>
            
            <hr/>
            
            <h3>Recommended Mentor Details</h3>
            <p><strong>Name:</strong> ${escapeHtml(sanitizedMentor.firstName)} ${escapeHtml(sanitizedMentor.lastName)}</p>
            <p><strong>Company:</strong> ${escapeHtml(sanitizedMentor.company)}</p>
            <p><strong>LinkedIn:</strong> <a href="${escapeHtml(sanitizedMentor.linkedinUrl)}">${escapeHtml(sanitizedMentor.linkedinUrl)}</a></p>
            ${sanitizedMentor.email ? `<p><strong>Email:</strong> ${escapeHtml(sanitizedMentor.email)}</p>` : '<p><strong>Email:</strong> <em>Not provided</em></p>'}
            
            <p style="margin-top: 20px; color: #666;">
              Please review and consider reaching out to this potential mentor.
            </p>
          `,
        }),
      });
    }

    console.log("Mentor recommendation submitted successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Mentor recommendation error");
    const message = error instanceof Error ? error.message : "Failed to submit recommendation";
    
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);

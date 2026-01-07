import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Convert ArrayBuffer to base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Generate HMAC signature for secure token verification
async function generateSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return arrayBufferToBase64(signature);
}

interface WelcomeEmailRequest {
  email: string;
  first_name: string;
  role: 'student' | 'mentor';
  wants_mentor?: boolean;
  user_id?: string;
  preferred_language?: 'en' | 'fr';
}

// Professional ACFE header with logo
const getAcfeHeader = () => `
  <div style="text-align: center; padding: 32px 24px; background: linear-gradient(135deg, #4a5d4a 0%, #5a6d5a 100%); border-radius: 12px 12px 0 0;">
    <img src="https://www.acloudforeveryone.org/acfe-logo-email.png" alt="ACFE Logo" style="height: 60px; width: auto; margin-bottom: 12px;" />
    <div style="font-size: 11px; color: rgba(255,255,255,0.85); letter-spacing: 2px; text-transform: uppercase;">A Cloud for Everyone</div>
  </div>
`;

const getAcfeFooter = (currentYear: number, lang: string = 'en') => `
  <div style="text-align: center; margin-top: 0; padding: 24px 32px; background-color: #f8f9fa; border-radius: 0 0 12px 12px;">
    <p style="color: #71717a; font-size: 13px; margin: 0 0 12px 0; line-height: 1.5;">
      ${lang === 'fr' ? 'Questions? Contactez-nous à' : 'Questions? Contact us at'} <a href="mailto:contact@acloudforeveryone.org" style="color: #4a5d4a;">contact@acloudforeveryone.org</a>
    </p>
    <p style="color: #a1a1aa; font-size: 11px; margin: 0;">
      © ${currentYear} A Cloud for Everyone. ${lang === 'fr' ? 'Tous droits réservés.' : 'All rights reserved.'}
    </p>
  </div>
`;

const handler = async (req: Request): Promise<Response> => {
  console.log("Welcome email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, first_name, role, wants_mentor, user_id, preferred_language = 'en' }: WelcomeEmailRequest = await req.json();
    const lang = preferred_language;
    // Input validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email) || email.length > 254) {
      console.error("Invalid email provided:", email);
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (first_name && (typeof first_name !== 'string' || first_name.length > 100)) {
      console.error("Invalid first_name provided");
      return new Response(
        JSON.stringify({ error: "Invalid name - must be under 100 characters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const validRoles = ['student', 'mentor'];
    if (!role || typeof role !== 'string' || !validRoles.includes(role)) {
      console.error("Invalid role provided:", role);
      return new Response(
        JSON.stringify({ error: "Invalid role" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Validate user_id format if provided (UUID format)
    if (user_id && (typeof user_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_id))) {
      console.error("Invalid user_id provided:", user_id);
      return new Response(
        JSON.stringify({ error: "Invalid user ID format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    console.log(`Sending welcome email to ${email} (${role}, wants_mentor: ${wants_mentor})`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const currentYear = new Date().getFullYear();
    const firstName = first_name || 'there';

    let subject: string;
    let htmlContent: string;

    if (wants_mentor) {
      // Email for users who want to become mentors
      subject = lang === 'fr' 
        ? `Bienvenue sur ACFE, ${firstName}`
        : `Welcome to ACFE, ${firstName}`;
      
      const content = lang === 'fr' ? {
        greeting: `Bienvenue, ${firstName}`,
        intro: "Merci de rejoindre A Cloud for Everyone. Nous avons bien reçu votre intérêt pour devenir mentor et notre équipe examinera votre candidature prochainement.",
        applicationTitle: "À propos de votre candidature",
        applicationDesc: "Tous les comptes commencent comme comptes apprenant. Notre équipe examinera votre candidature dans les 3-5 jours ouvrables et vous recevrez une notification par email.",
        nextStepsTitle: "En attendant, vous pouvez",
        step1: "Explorer nos cours et commencer à apprendre",
        step2: "Compléter votre profil pour une meilleure candidature",
        step3: "Découvrir notre Incubateur d'Innovateurs",
        exploreCta: "Explorer les Cours",
        startupCta: "Soumettre une Idée de Startup",
        tagline: "Il y a un cloud pour tout le monde.",
        team: "L'Équipe ACFE"
      } : {
        greeting: `Welcome, ${firstName}`,
        intro: "Thank you for joining A Cloud for Everyone. We've received your interest in becoming a mentor and our team will review your application shortly.",
        applicationTitle: "About Your Application",
        applicationDesc: "All accounts start as learner accounts. Our team will review your application within 3-5 business days and you'll receive an email notification with our decision.",
        nextStepsTitle: "In the meantime, you can",
        step1: "Explore our courses and start learning",
        step2: "Complete your profile to strengthen your application",
        step3: "Discover our Innovators Incubator",
        exploreCta: "Explore Courses",
        startupCta: "Submit a Startup Idea",
        tagline: "There's a cloud for everyone.",
        team: "The ACFE Team"
      };

      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    ${getAcfeHeader()}
    
    <div style="background-color: #ffffff; padding: 32px;">
      <h1 style="margin: 0 0 24px 0; font-size: 26px; color: #18181b; font-weight: 600;">${content.greeting}</h1>
      
      <p style="margin: 0 0 24px 0; line-height: 1.7; color: #3f3f46; font-size: 15px;">
        ${content.intro}
      </p>
      
      <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 0 0 24px 0; border-left: 4px solid #4a5d4a;">
        <h3 style="margin: 0 0 8px 0; font-size: 15px; color: #166534; font-weight: 600;">${content.applicationTitle}</h3>
        <p style="margin: 0; line-height: 1.6; font-size: 14px; color: #3f3f46;">
          ${content.applicationDesc}
        </p>
      </div>
      
      <h2 style="margin: 0 0 16px 0; font-size: 16px; color: #18181b; font-weight: 600;">${content.nextStepsTitle}</h2>
      <ul style="margin: 0 0 28px 0; padding-left: 20px; color: #3f3f46; font-size: 14px; line-height: 1.8;">
        <li>${content.step1}</li>
        <li>${content.step2}</li>
        <li>${content.step3}</li>
      </ul>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://www.acloudforeveryone.org/courses" style="display: inline-block; background-color: #4a5d4a; color: #ffffff; padding: 14px 32px; text-decoration: none; font-weight: 600; border-radius: 6px; font-size: 14px; margin-right: 12px;">${content.exploreCta}</a>
        <a href="https://www.acloudforeveryone.org/startups" style="display: inline-block; background-color: #ffffff; color: #4a5d4a; padding: 14px 32px; text-decoration: none; font-weight: 600; border-radius: 6px; font-size: 14px; border: 2px solid #4a5d4a;">${content.startupCta}</a>
      </div>
      
      <p style="margin: 32px 0 0 0; font-size: 15px; color: #18181b; font-weight: 500;">${content.tagline}</p>
      
      <p style="margin: 16px 0 0 0; color: #71717a; font-size: 14px;">
        ${content.team}
      </p>
    </div>
    
    ${getAcfeFooter(currentYear, lang)}
  </div>
</body>
</html>
      `;

      // Get the mentor role request ID for this user
      let requestId = null;
      if (user_id) {
        const { data: mentorRequest } = await supabase
          .from('mentor_role_requests')
          .select('id')
          .eq('user_id', user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (mentorRequest) {
          requestId = mentorRequest.id;
        }
      }

      // Notify admins about the new mentor application
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminRoles && adminRoles.length > 0) {
        const adminUserIds = adminRoles.map((r: { user_id: string }) => r.user_id);
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', adminUserIds);

        if (adminProfiles && adminProfiles.length > 0) {
          const sharedSecret = Deno.env.get("ACFE_SHARED_SECRET");
          
          for (const admin of adminProfiles) {
            // Generate signed URLs for this specific admin
            let approveUrl = '';
            let declineUrl = '';
            
            if (requestId && sharedSecret) {
              const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
              const functionBaseUrl = `${supabaseUrl}/functions/v1/handle-mentor-action`;
              
              // Generate HMAC signatures for each action
              const approveData = `approve:${requestId}:${admin.id}`;
              const declineData = `decline:${requestId}:${admin.id}`;
              
              const approveToken = await generateSignature(approveData, sharedSecret);
              const declineToken = await generateSignature(declineData, sharedSecret);
              
              // URL-encode the tokens
              const encodedApproveToken = encodeURIComponent(approveToken);
              const encodedDeclineToken = encodeURIComponent(declineToken);
              
              approveUrl = `${functionBaseUrl}?action=approve&request_id=${requestId}&admin_id=${admin.id}&token=${encodedApproveToken}`;
              declineUrl = `${functionBaseUrl}?action=decline&request_id=${requestId}&admin_id=${admin.id}&token=${encodedDeclineToken}`;
            }
            
            const adminHtmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    ${getAcfeHeader()}
    
    <!-- Main content -->
    <div style="background-color: #ffffff; padding: 32px; border-radius: 0 0 12px 12px;">
      <h1 style="margin: 0 0 20px 0; font-size: 22px; color: #18181b;">New Mentor Application</h1>
      
      <p style="margin: 0 0 20px 0; line-height: 1.6; color: #333333;">
        Hello ${admin.full_name?.split(' ')[0] || 'Admin'},
      </p>
      
      <p style="margin: 0 0 20px 0; line-height: 1.6; color: #333333;">
        A new user has registered and expressed interest in becoming a mentor on A Cloud for Everyone.
      </p>
      
      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 16px;">Applicant Details:</h3>
        <table style="width: 100%;">
          <tr>
            <td style="padding: 5px 0; color: #666666;">Name:</td>
            <td style="padding: 5px 0; color: #1a1a1a; font-weight: 500;">${firstName}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #666666;">Email:</td>
            <td style="padding: 5px 0; color: #1a1a1a; font-weight: 500;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #666666;">Status:</td>
            <td style="padding: 5px 0;"><span style="background-color: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Pending Review</span></td>
          </tr>
        </table>
      </div>
      
      ${approveUrl && declineUrl ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${approveUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; margin-right: 10px;">✓ Approve</a>
        <a href="${declineUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px;">✗ Decline</a>
      </div>
      <p style="margin: 10px 0 20px 0; line-height: 1.4; color: #999999; font-size: 11px; text-align: center;">
        ⚠️ These action links are unique to you and cannot be shared.
      </p>
      ` : ''}
      
      <p style="margin: 20px 0; line-height: 1.6; color: #666666; font-size: 14px;">
        You can also review this application in the <a href="https://www.acloudforeveryone.org/admin/users" style="color: #4a5d4a;">Admin Dashboard</a>.
      </p>
    </div>
    
    ${getAcfeFooter(currentYear)}
  </div>
</body>
</html>
            `;

            try {
              await resend.emails.send({
                from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
                to: [admin.email],
                subject: `🎓 New Mentor Application: ${firstName}`,
                html: adminHtmlContent,
              });
              console.log(`Admin notification sent to ${admin.email}`);
            } catch (adminEmailError) {
              console.error(`Failed to send admin notification to ${admin.email}:`, adminEmailError);
            }
          }

          // Log the admin notification
          await supabase.from('email_logs').insert({
            subject: `Admin Notification: New Mentor Application - ${firstName}`,
            status: 'sent',
            sent_at: new Date().toISOString()
          });
        }
      }

    } else if (role === 'mentor') {
      // Approved mentor welcome email
      subject = `Welcome to ACFE, ${firstName}`;
      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    ${getAcfeHeader()}
    
    <div style="background-color: #ffffff; padding: 32px;">
      <h1 style="margin: 0 0 24px 0; font-size: 26px; color: #18181b; font-weight: 600;">Welcome, ${firstName}</h1>
      
      <p style="margin: 0 0 20px 0; line-height: 1.7; color: #3f3f46; font-size: 15px;">
        Thank you for stepping forward to mentor the next generation of tech talent. Your knowledge and experience will help learners across Africa build digital skills and career readiness.
      </p>
      
      <h2 style="margin: 28px 0 16px 0; font-size: 16px; color: #18181b; font-weight: 600;">What to expect</h2>
      <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #3f3f46; font-size: 14px; line-height: 1.8;">
        <li>Flexible mentorship opportunities</li>
        <li>Support materials to guide your sessions</li>
        <li>Regular updates on training cohorts and learner progress</li>
        <li>A growing network of like-minded professionals</li>
      </ul>
      
      <p style="margin: 0 0 28px 0; line-height: 1.7; color: #3f3f46; font-size: 15px;">
        We'll be in touch soon with next steps, available cohorts, and resources to help you get started.
      </p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://www.acloudforeveryone.org/dashboard" style="display: inline-block; background-color: #4a5d4a; color: #ffffff; padding: 14px 32px; text-decoration: none; font-weight: 600; border-radius: 6px; font-size: 14px;">Go to Dashboard</a>
      </div>
      
      <p style="margin: 32px 0 0 0; font-size: 15px; color: #18181b; font-weight: 500;">There's a cloud for everyone.</p>
      
      <p style="margin: 16px 0 0 0; color: #71717a; font-size: 14px;">
        The ACFE Team
      </p>
    </div>
    
    ${getAcfeFooter(currentYear, 'en')}
  </div>
</body>
</html>
      `;
    } else {
      // Standard student welcome email - Clean and professional
      subject = lang === 'fr'
        ? `Bienvenue sur ACFE, ${firstName}`
        : `Welcome to ACFE, ${firstName}`;
      
      const content = lang === 'fr' ? {
        greeting: `Bienvenue, ${firstName}`,
        intro: "Merci de rejoindre A Cloud for Everyone. Nous sommes ravis de vous accueillir dans notre communauté d'apprenants qui développent les compétences numériques nécessaires pour prospérer dans le monde technologique d'aujourd'hui.",
        gettingStartedTitle: "Pour commencer",
        step1: "Parcourez nos cours et inscrivez-vous à ceux qui correspondent à vos objectifs",
        step2: "Connectez-vous avec des mentors qui peuvent guider votre parcours",
        step3: "Complétez votre profil pour aider les mentors à mieux vous connaître",
        startupNote: "Vous avez une idée de startup? Soumettez-la via notre Incubateur d'Innovateurs pour du mentorat et jusqu'à $1000 de financement.",
        exploreCta: "Explorer les Cours",
        startupCta: "Soumettre une Idée",
        tagline: "Il y a un cloud pour tout le monde.",
        team: "L'Équipe ACFE"
      } : {
        greeting: `Welcome, ${firstName}`,
        intro: "Thank you for joining A Cloud for Everyone. We're thrilled to have you in our community of learners building the digital skills needed to thrive in today's tech-driven world.",
        gettingStartedTitle: "Getting started",
        step1: "Browse our courses and enroll in ones that match your goals",
        step2: "Connect with mentors who can guide your learning journey",
        step3: "Complete your profile to help mentors understand your background",
        startupNote: "Have a startup idea? Submit it through our Innovators Incubator for mentorship and up to $1000 in funding.",
        exploreCta: "Explore Courses",
        startupCta: "Submit an Idea",
        tagline: "There's a cloud for everyone.",
        team: "The ACFE Team"
      };

      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    ${getAcfeHeader()}
    
    <div style="background-color: #ffffff; padding: 32px;">
      <h1 style="margin: 0 0 24px 0; font-size: 26px; color: #18181b; font-weight: 600;">${content.greeting}</h1>
      
      <p style="margin: 0 0 24px 0; line-height: 1.7; color: #3f3f46; font-size: 15px;">
        ${content.intro}
      </p>
      
      <h2 style="margin: 0 0 16px 0; font-size: 16px; color: #18181b; font-weight: 600;">${content.gettingStartedTitle}</h2>
      <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #3f3f46; font-size: 14px; line-height: 1.8;">
        <li>${content.step1}</li>
        <li>${content.step2}</li>
        <li>${content.step3}</li>
      </ul>
      
      <div style="background-color: #fef7ed; border-radius: 8px; padding: 16px 20px; margin: 0 0 28px 0; border-left: 4px solid #c9a86c;">
        <p style="margin: 0; line-height: 1.6; font-size: 14px; color: #78350f;">
          ${content.startupNote}
        </p>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://www.acloudforeveryone.org/courses" style="display: inline-block; background-color: #4a5d4a; color: #ffffff; padding: 14px 32px; text-decoration: none; font-weight: 600; border-radius: 6px; font-size: 14px; margin-right: 12px;">${content.exploreCta}</a>
        <a href="https://www.acloudforeveryone.org/startups" style="display: inline-block; background-color: #ffffff; color: #4a5d4a; padding: 14px 32px; text-decoration: none; font-weight: 600; border-radius: 6px; font-size: 14px; border: 2px solid #4a5d4a;">${content.startupCta}</a>
      </div>
      
      <p style="margin: 32px 0 0 0; font-size: 15px; color: #18181b; font-weight: 500;">${content.tagline}</p>
      
      <p style="margin: 16px 0 0 0; color: #71717a; font-size: 14px;">
        ${content.team}
      </p>
    </div>
    
    ${getAcfeFooter(currentYear, lang)}
  </div>
</body>
</html>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject: subject,
      html: htmlContent,
    });

    console.log("Welcome email sent:", emailResponse);

    // Log the email
    await supabase.from('email_logs').insert({
      subject: subject,
      status: 'sent',
      sent_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
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

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildCanonicalEmail, EmailLanguage } from "../_shared/email-template.ts";
import { escapeHtml } from "../_shared/html-escape.ts";

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
  preferred_language?: EmailLanguage;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[SEND-WELCOME-EMAIL] Function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, first_name, role, wants_mentor, user_id, preferred_language = 'en' }: WelcomeEmailRequest = await req.json();
    const lang: EmailLanguage = preferred_language === 'fr' ? 'fr' : 'en';
    
    // Input validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email) || email.length > 254) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (first_name && (typeof first_name !== 'string' || first_name.length > 100)) {
      return new Response(
        JSON.stringify({ error: "Invalid name - must be under 100 characters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const validRoles = ['student', 'mentor'];
    if (!role || typeof role !== 'string' || !validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: "Invalid role" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (user_id && (typeof user_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_id))) {
      return new Response(
        JSON.stringify({ error: "Invalid user ID format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    console.log(`[SEND-WELCOME-EMAIL] Sending to ${email} (${role}, wants_mentor: ${wants_mentor})`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Escape all user-provided data
    const safeFirstName = escapeHtml(first_name) || (lang === 'fr' ? 'Apprenant' : 'Learner');
    const safeEmail = escapeHtml(email);

    // ========================================
    // Call centralized send-email function with service role key
    // ========================================
    let emailSent = false;
    let emailError: string | null = null;
    
    try {
      const emailResponse = await fetch(
        `${supabaseUrl}/functions/v1/send-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'welcome',
            to: email,
            data: {
              userName: safeFirstName,
              userEmail: email,
              heading: lang === 'fr' ? 'Bienvenue' : 'Welcome, there',
              introText: lang === 'fr' 
                ? "Merci d'avoir rejoint A Cloud for Everyone. Nous sommes ravis de vous accueillir dans notre communauté d'apprenants qui développent les compétences numériques nécessaires pour réussir dans le monde technologique d'aujourd'hui."
                : "Thank you for joining A Cloud for Everyone. We're thrilled to have you in our community of learners building the digital skills needed to thrive in today's tech-driven world.",
              gettingStartedTitle: lang === 'fr' ? 'Pour commencer' : 'Getting started',
              gettingStartedItems: lang === 'fr' 
                ? [
                    'Parcourez nos cours et inscrivez-vous à ceux qui correspondent à vos objectifs',
                    'Connectez-vous avec des mentors qui peuvent guider votre parcours',
                    'Complétez votre profil pour aider les mentors à comprendre votre parcours'
                  ]
                : [
                    'Browse our courses and enroll in ones that match your goals',
                    'Connect with mentors who can guide your learning journey',
                    'Complete your profile to help mentors understand your background'
                  ],
              calloutText: lang === 'fr'
                ? "Vous avez une idée de startup ? Soumettez-la via notre Incubateur d'Innovateurs pour du mentorat et jusqu'à 1000$ de financement."
                : 'Have a startup idea? Submit it through our Innovators Incubator for mentorship and up to $1000 in funding.',
              ctaButtons: [
                { 
                  text: lang === 'fr' ? 'Explorer les cours' : 'Explore Courses', 
                  url: 'https://acloudforeveryone.org/courses' 
                },
                { 
                  text: lang === 'fr' ? 'Soumettre une idée' : 'Submit an Idea', 
                  url: 'https://acloudforeveryone.org/submit-idea' 
                }
              ],
              closingText: lang === 'fr' ? "Il y a un nuage pour tout le monde." : "There's a cloud for everyone.",
              signature: lang === 'fr' ? "L'Équipe ACFE" : 'The ACFE Team'
            },
            userId: user_id,
            language: lang
          })
        }
      );

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('[SEND-WELCOME-EMAIL] Centralized email failed:', errorText);
        emailError = errorText;
      } else {
        const result = await emailResponse.json();
        console.log('[SEND-WELCOME-EMAIL] Centralized email sent:', result);
        emailSent = true;
      }
    } catch (centralizedError) {
      console.error('[SEND-WELCOME-EMAIL] Centralized email error:', centralizedError);
      emailError = String(centralizedError);
    }
    
    // CRITICAL: If welcome email failed, return error (don't silently continue)
    if (!emailSent) {
      console.error('[SEND-WELCOME-EMAIL] Failed to send welcome email to user');
      return new Response(
        JSON.stringify({ error: emailError || 'Failed to send welcome email' }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Notify admins about mentor applications
    if (wants_mentor && user_id) {
      const { data: mentorRequest } = await supabase
        .from('mentor_role_requests')
        .select('id')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (mentorRequest) {
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

          const sharedSecret = Deno.env.get("ACFE_SHARED_SECRET");

          for (const admin of adminProfiles || []) {
            let approveUrl = '';
            let declineUrl = '';
            
            if (sharedSecret) {
              const functionBaseUrl = `${supabaseUrl}/functions/v1/handle-mentor-action`;
              const approveToken = await generateSignature(`approve:${mentorRequest.id}:${admin.id}`, sharedSecret);
              const declineToken = await generateSignature(`decline:${mentorRequest.id}:${admin.id}`, sharedSecret);
              approveUrl = `${functionBaseUrl}?action=approve&request_id=${mentorRequest.id}&admin_id=${admin.id}&token=${encodeURIComponent(approveToken)}`;
              declineUrl = `${functionBaseUrl}?action=decline&request_id=${mentorRequest.id}&admin_id=${admin.id}&token=${encodeURIComponent(declineToken)}`;
            }

            const adminHtml = buildCanonicalEmail({
              headline: 'New Mentor Application',
              body_primary: `<p style="margin: 0 0 16px 0;">Hello ${escapeHtml(admin.full_name?.split(' ')[0]) || 'Admin'},</p>
                <p style="margin: 0 0 16px 0;">A new user has registered and expressed interest in becoming a mentor.</p>
                <p style="margin: 0;"><strong>Name:</strong> ${safeFirstName}<br><strong>Email:</strong> ${safeEmail}</p>`,
              primary_cta: approveUrl ? { label: 'Approve', url: approveUrl } : undefined,
              secondary_cta: declineUrl ? { label: 'Decline', url: declineUrl } : undefined
            }, 'en');

            try {
              await resend.emails.send({
                from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
                to: [admin.email],
                subject: `New Mentor Application: ${safeFirstName}`,
                html: adminHtml,
              });
            } catch (adminEmailError) {
              console.error(`Failed to send admin notification to ${admin.email}:`, adminEmailError);
            }
          }
        }
      }
    }

    // Notify admins about ALL new signups (not just mentor applications)
    if (!wants_mentor) {
      try {
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

          for (const admin of adminProfiles || []) {
            const adminHtml = buildCanonicalEmail({
              headline: 'New User Registration',
              body_primary: `<p style="margin: 0 0 16px 0;">Hello ${escapeHtml(admin.full_name?.split(' ')[0]) || 'Admin'},</p>
                <p style="margin: 0 0 16px 0;">A new user has registered on the platform.</p>
                <p style="margin: 0;"><strong>Name:</strong> ${safeFirstName}<br><strong>Email:</strong> ${safeEmail}<br><strong>Role:</strong> ${role}</p>`,
              primary_cta: {
                label: 'View Users',
                url: 'https://acloudforeveryone.org/admin/users'
              }
            }, 'en');

            await resend.emails.send({
              from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
              to: [admin.email],
              subject: `New User Registration: ${safeFirstName}`,
              html: adminHtml,
            });
          }
          console.log("[SEND-WELCOME-EMAIL] Admin notifications sent for new user signup");
        }
      } catch (adminNotifyError) {
        console.error("[SEND-WELCOME-EMAIL] Failed to send admin notifications:", adminNotifyError);
        // Don't fail the main request if admin notification fails
      }
    }

    await supabase.from('email_logs').insert({
      subject: lang === 'fr' ? `Bienvenue sur ACFE, ${safeFirstName}!` : `Welcome to ACFE, ${safeFirstName}!`,
      status: 'sent',
      sent_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[SEND-WELCOME-EMAIL] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildCanonicalEmail, EmailLanguage, getSubTranslation } from "../_shared/email-template.ts";
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
  console.log("Welcome email function called");
  
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
    
    console.log(`Sending welcome email to ${email} (${role}, wants_mentor: ${wants_mentor})`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Escape all user-provided data
    const safeFirstName = escapeHtml(first_name) || (lang === 'fr' ? 'Apprenant' : 'Learner');
    const safeEmail = escapeHtml(email);
    const greeting = lang === 'fr' ? 'Cher' : 'Dear';

    let subject: string;
    let htmlContent: string;

    if (wants_mentor) {
      // User wants to become a mentor
      subject = lang === 'fr' 
        ? `Bienvenue sur ACFE, ${safeFirstName}!`
        : `Welcome to ACFE, ${safeFirstName}!`;
      
      const bodyContent = lang === 'fr'
        ? `<p style="margin: 0 0 16px 0;">${greeting} ${safeFirstName},</p>
           <p style="margin: 0 0 16px 0;">Merci de rejoindre A Cloud for Everyone. Nous avons bien reçu votre intérêt pour devenir mentor et notre équipe examinera votre candidature prochainement.</p>
           <p style="margin: 0;">Tous les comptes commencent comme comptes apprenant. Notre équipe examinera votre candidature dans les 3-5 jours ouvrables et vous recevrez une notification par email.</p>`
        : `<p style="margin: 0 0 16px 0;">${greeting} ${safeFirstName},</p>
           <p style="margin: 0 0 16px 0;">Thank you for joining A Cloud for Everyone. We've received your interest in becoming a mentor and our team will review your application shortly.</p>
           <p style="margin: 0;">All accounts start as learner accounts. Our team will review your application within 3-5 business days and you'll receive an email notification with our decision.</p>`;

      htmlContent = buildCanonicalEmail({
        headline: lang === 'fr' ? `Bienvenue, ${safeFirstName}!` : `Welcome, ${safeFirstName}!`,
        body_primary: bodyContent,
        impact_block: {
          title: lang === 'fr' ? 'En attendant, vous pouvez' : 'In the meantime, you can',
          items: lang === 'fr' ? [
            'Explorer nos cours et commencer à apprendre',
            'Compléter votre profil pour une meilleure candidature',
            'Découvrir notre Incubateur d\'Innovateurs'
          ] : [
            'Explore our courses and start learning',
            'Complete your profile to strengthen your application',
            'Discover our Innovators Incubator'
          ]
        },
        primary_cta: {
          label: lang === 'fr' ? 'Explorer les Cours' : 'Explore Courses',
          url: 'https://acloudforeveryone.org/courses'
        },
        secondary_cta: {
          label: lang === 'fr' ? 'Soumettre une Idée' : 'Submit an Idea',
          url: 'https://acloudforeveryone.org/submit-idea'
        }
      }, lang);

      // Notify admins about new mentor application
      if (user_id) {
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
    } else {
      // Regular student welcome
      subject = lang === 'fr' 
        ? `Bienvenue sur ACFE, ${safeFirstName}!`
        : `Welcome to ACFE, ${safeFirstName}!`;

      const bodyContent = lang === 'fr'
        ? `<p style="margin: 0 0 16px 0;">${greeting} ${safeFirstName},</p>
           <p style="margin: 0;">Nous sommes ravis de vous accueillir dans notre communauté d'apprenants et de mentors dédiée à l'avancement des compétences numériques en Afrique.</p>`
        : `<p style="margin: 0 0 16px 0;">${greeting} ${safeFirstName},</p>
           <p style="margin: 0;">We're thrilled to have you join our community of learners and mentors dedicated to advancing digital skills across Africa.</p>`;

      htmlContent = buildCanonicalEmail({
        headline: lang === 'fr' ? `Bienvenue, ${safeFirstName}!` : `Welcome, ${safeFirstName}!`,
        body_primary: bodyContent,
        impact_block: {
          title: lang === 'fr' ? 'Ce que vous pouvez faire' : 'What you can do',
          items: lang === 'fr' ? [
            'Parcourez nos cours et commencez à apprendre',
            'Connectez-vous avec des mentors expérimentés',
            'Rejoignez les discussions de la communauté'
          ] : [
            'Browse our courses and start learning',
            'Connect with experienced mentors',
            'Join community discussions'
          ]
        },
        primary_cta: {
          label: lang === 'fr' ? 'Explorer les Cours' : 'Explore Courses',
          url: 'https://acloudforeveryone.org/courses'
        },
        secondary_cta: {
          label: lang === 'fr' ? 'Soumettre une Idée' : 'Submit an Idea',
          url: 'https://acloudforeveryone.org/submit-idea'
        }
      }, lang);
    }

    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject: subject,
      html: htmlContent,
    });

    console.log("Welcome email sent:", emailResponse);

    await supabase.from('email_logs').insert({
      subject: subject,
      status: 'sent',
      sent_at: new Date().toISOString()
    });

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
          console.log("Admin notifications sent for new user signup");
        }
      } catch (adminNotifyError) {
        console.error("Failed to send admin notifications for new signup:", adminNotifyError);
        // Don't fail the main request if admin notification fails
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

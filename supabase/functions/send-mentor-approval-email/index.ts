import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildCanonicalEmail, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MentorApprovalRequest {
  user_id: string;
  email: string;
  first_name: string;
  language?: string;
}

const translations = {
  en: {
    subject: 'Welcome to the Mentor Team!',
    headline: 'Welcome to the Team!',
    body: (name: string) => `<p>Dear ${name},</p><p>Congratulations! Your application to become a mentor at A Cloud for Everyone has been approved. You are now officially part of our mentor community.</p><p>Your experience and expertise will directly support learners across Africa in building their tech careers.</p>`,
    impact_title: 'Getting Started:',
    items: [
      'Complete your mentor profile',
      'Create your first course',
      'Explore existing cohorts',
    ],
    cta_primary: 'Complete Profile',
    cta_secondary: 'Create a Course',
  },
  fr: {
    subject: 'Bienvenue dans l\'équipe de Mentors!',
    headline: 'Bienvenue dans l\'Équipe!',
    body: (name: string) => `<p>Cher/Chère ${name},</p><p>Félicitations! Votre candidature pour devenir mentor chez A Cloud for Everyone a été approuvée. Vous faites maintenant officiellement partie de notre communauté de mentors.</p><p>Votre expérience et expertise soutiendront directement les apprenants à travers l'Afrique dans la construction de leurs carrières tech.</p>`,
    impact_title: 'Pour Commencer:',
    items: [
      'Complétez votre profil de mentor',
      'Créez votre premier cours',
      'Explorez les cohortes existantes',
    ],
    cta_primary: 'Compléter le Profil',
    cta_secondary: 'Créer un Cours',
  },
};

const verifyAdminRole = async (req: Request): Promise<{ isAdmin: boolean; userId: string | null; error?: string }> => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { isAdmin: false, userId: null, error: 'Missing authorization header' };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { isAdmin: false, userId: null, error: 'Invalid or expired token' };
  }

  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data: roleData, error: roleError } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (roleError || !roleData) {
    return { isAdmin: false, userId: user.id, error: 'User is not an admin' };
  }

  return { isAdmin: true, userId: user.id };
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Mentor approval email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { isAdmin, error: authError } = await verifyAdminRole(req);
  if (!isAdmin) {
    console.error("Authorization failed:", authError);
    return new Response(
      JSON.stringify({ error: authError || 'Unauthorized' }),
      { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, email, first_name, language: reqLanguage }: MentorApprovalRequest = await req.json();

    // Get user's preferred language
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_language')
      .eq('id', user_id)
      .single();

    const language: EmailLanguage = (reqLanguage === 'fr' || profile?.preferred_language === 'fr') ? 'fr' : 'en';
    const t = translations[language];

    console.log(`Admin authorized. Sending mentor approval email to ${email} in ${language}`);

    const htmlContent = buildCanonicalEmail({
      headline: t.headline,
      body_primary: t.body(first_name || 'Mentor'),
      impact_block: {
        title: t.impact_title,
        items: t.items,
      },
      primary_cta: {
        label: t.cta_primary,
        url: 'https://acloudforeveryone.org/profile',
      },
      secondary_cta: {
        label: t.cta_secondary,
        url: 'https://acloudforeveryone.org/mentor/courses',
      },
    }, language);

    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject: t.subject,
      html: htmlContent,
    });

    console.log("Mentor approval email sent:", emailResponse);

    await supabase.from('email_logs').insert({
      subject: t.subject,
      status: 'sent',
      sent_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-mentor-approval-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

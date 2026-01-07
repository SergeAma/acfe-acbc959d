import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildCanonicalEmail, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MentorRejectionRequest {
  user_id: string;
  email: string;
  first_name: string;
  language?: string;
}

const translations = {
  en: {
    subject: 'Update on Your Mentor Application',
    headline: 'Application Update',
    body: (name: string) => `<p>Dear ${name},</p><p>Thank you for your interest in becoming a mentor at A Cloud for Everyone. After careful review, we regret to inform you that we are unable to approve your application at this time.</p><p>This decision is not a reflection of your abilities or experience. We encourage you to continue developing your expertise and to consider reapplying in the future.</p><p>In the meantime, we invite you to explore our platform as a learner and engage with our community.</p>`,
    cta: 'Explore Courses',
  },
  fr: {
    subject: 'Mise à jour sur Votre Candidature de Mentor',
    headline: 'Mise à Jour de Candidature',
    body: (name: string) => `<p>Cher/Chère ${name},</p><p>Merci pour votre intérêt à devenir mentor chez A Cloud for Everyone. Après examen attentif, nous avons le regret de vous informer que nous ne sommes pas en mesure d'approuver votre candidature pour le moment.</p><p>Cette décision ne reflète pas vos capacités ou votre expérience. Nous vous encourageons à continuer à développer votre expertise et à envisager de postuler à nouveau à l'avenir.</p><p>En attendant, nous vous invitons à explorer notre plateforme en tant qu'apprenant et à vous engager avec notre communauté.</p>`,
    cta: 'Explorer les Cours',
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
  console.log("Mentor rejection email function called");
  
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

    const { user_id, email, first_name, language: reqLanguage }: MentorRejectionRequest = await req.json();

    // Get user's preferred language
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_language')
      .eq('id', user_id)
      .single();

    const language: EmailLanguage = (reqLanguage === 'fr' || profile?.preferred_language === 'fr') ? 'fr' : 'en';
    const t = translations[language];

    console.log(`Admin authorized. Sending mentor rejection email to ${email} in ${language}`);

    const htmlContent = buildCanonicalEmail({
      headline: t.headline,
      body_primary: t.body(first_name || 'Applicant'),
      primary_cta: {
        label: t.cta,
        url: 'https://acloudforeveryone.org/courses',
      },
    }, language);

    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject: t.subject,
      html: htmlContent,
    });

    console.log("Mentor rejection email sent:", emailResponse);

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
    console.error("Error in send-mentor-rejection-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

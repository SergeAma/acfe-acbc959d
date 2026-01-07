import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildCanonicalEmail, EmailLanguage } from "../_shared/email-template.ts";
import { FRANCOPHONE_COUNTRIES } from "../_shared/email-translations.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InstitutionRequestResponse {
  mentor_id: string;
  mentor_email: string;
  mentor_name: string;
  institution_name: string;
  request_type: 'exclusive_content' | 'cohort_mentoring';
  status: 'approved' | 'rejected';
  admin_response?: string;
}

const translations = {
  en: {
    approved: {
      subject: (institution: string) => `Your Institution Partnership Request is Approved - ${institution}`,
      headline: 'Request Approved!',
      body: (name: string, institution: string, type: string, response?: string) => `
        <p>Dear ${name},</p>
        <p>Great news! Your request to ${type === 'exclusive_content' ? 'create exclusive content for' : 'mentor a cohort from'} <strong>${institution}</strong> has been approved.</p>
        ${type === 'cohort_mentoring' ? '<p>A new institution cohort has been created for you. Students from this institution can now request to join your cohort.</p>' : '<p>You can now create courses exclusively available to students from this institution.</p>'}
        ${response ? `<p><strong>Admin note:</strong> ${response}</p>` : ''}
      `,
      cta: 'Go to Dashboard',
    },
    rejected: {
      subject: (institution: string) => `Update on Your Institution Request - ${institution}`,
      headline: 'Request Update',
      body: (name: string, institution: string, type: string, response?: string) => `
        <p>Dear ${name},</p>
        <p>Thank you for your interest in partnering with <strong>${institution}</strong>. After careful review, we are unable to approve your ${type === 'exclusive_content' ? 'exclusive content creation' : 'cohort mentoring'} request at this time.</p>
        ${response ? `<p><strong>Admin feedback:</strong> ${response}</p>` : ''}
        <p>You may submit a new request in the future if circumstances change. In the meantime, continue building your impact through your existing courses and cohorts.</p>
      `,
      cta: 'View Other Opportunities',
    },
  },
  fr: {
    approved: {
      subject: (institution: string) => `Votre demande de partenariat est approuvée - ${institution}`,
      headline: 'Demande Approuvée!',
      body: (name: string, institution: string, type: string, response?: string) => `
        <p>Cher/Chère ${name},</p>
        <p>Bonne nouvelle! Votre demande pour ${type === 'exclusive_content' ? 'créer du contenu exclusif pour' : 'mentorer une cohorte de'} <strong>${institution}</strong> a été approuvée.</p>
        ${type === 'cohort_mentoring' ? '<p>Une nouvelle cohorte institutionnelle a été créée pour vous. Les étudiants de cette institution peuvent maintenant demander à rejoindre votre cohorte.</p>' : '<p>Vous pouvez maintenant créer des cours exclusivement disponibles pour les étudiants de cette institution.</p>'}
        ${response ? `<p><strong>Note de l'admin:</strong> ${response}</p>` : ''}
      `,
      cta: 'Aller au Tableau de Bord',
    },
    rejected: {
      subject: (institution: string) => `Mise à jour de votre demande - ${institution}`,
      headline: 'Mise à Jour de la Demande',
      body: (name: string, institution: string, type: string, response?: string) => `
        <p>Cher/Chère ${name},</p>
        <p>Merci pour votre intérêt à collaborer avec <strong>${institution}</strong>. Après examen attentif, nous ne sommes pas en mesure d'approuver votre demande de ${type === 'exclusive_content' ? 'création de contenu exclusif' : 'mentorat de cohorte'} pour le moment.</p>
        ${response ? `<p><strong>Retour de l'admin:</strong> ${response}</p>` : ''}
        <p>Vous pouvez soumettre une nouvelle demande à l'avenir si les circonstances changent. En attendant, continuez à développer votre impact à travers vos cours et cohortes existants.</p>
      `,
      cta: 'Voir Autres Opportunités',
    },
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
  
  const { data: roleData } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (!roleData) {
    return { isAdmin: false, userId: user.id, error: 'User is not an admin' };
  }

  return { isAdmin: true, userId: user.id };
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Institution request response notification function called");
  
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

    const { 
      mentor_id, 
      mentor_email, 
      mentor_name, 
      institution_name, 
      request_type, 
      status, 
      admin_response 
    }: InstitutionRequestResponse = await req.json();

    // Get mentor's preferred language
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_language, country')
      .eq('id', mentor_id)
      .single();

    let language: EmailLanguage = 'en';
    if (profile?.preferred_language === 'fr') {
      language = 'fr';
    } else if (profile?.country && FRANCOPHONE_COUNTRIES.includes(profile.country)) {
      language = 'fr';
    }

    const t = translations[language][status];
    const firstName = mentor_name?.split(' ')[0] || 'Mentor';

    const htmlContent = buildCanonicalEmail({
      headline: t.headline,
      body_primary: t.body(firstName, institution_name, request_type, admin_response),
      primary_cta: {
        label: t.cta,
        url: status === 'approved' 
          ? 'https://acloudforeveryone.org/dashboard' 
          : 'https://acloudforeveryone.org/mentor/courses',
      },
    }, language);

    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [mentor_email],
      subject: t.subject(institution_name),
      html: htmlContent,
    });

    console.log("Mentor notification email sent:", emailResponse);

    await supabase.from('email_logs').insert({
      subject: t.subject(institution_name),
      status: 'sent',
      sent_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-institution-request-response:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

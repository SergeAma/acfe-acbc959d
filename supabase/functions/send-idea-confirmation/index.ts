import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildCanonicalEmail, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IdeaConfirmationRequest {
  name: string;
  email: string;
  ideaTitle: string;
  language?: EmailLanguage;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, ideaTitle, language = 'en' }: IdeaConfirmationRequest = await req.json();
    const lang: EmailLanguage = language === 'fr' ? 'fr' : 'en';
    
    if (!name || !email || !ideaTitle) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (name.length > 100 || ideaTitle.length > 200 || !emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid input" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: submission } = await supabase
      .from('idea_submissions')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .eq('idea_title', ideaTitle.trim())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (!submission) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const safeName = escapeHtml(name.trim());
    const safeIdeaTitle = escapeHtml(ideaTitle.trim());
    const greeting = lang === 'fr' ? 'Cher' : 'Dear';

    const subject = lang === 'fr' 
      ? 'Nous avons reçu votre soumission d\'idée!'
      : 'We\'ve Received Your Idea Submission!';

    const bodyContent = lang === 'fr'
      ? `<p style="margin: 0 0 16px 0;">${greeting} ${safeName},</p>
         <p style="margin: 0 0 16px 0;">Nous sommes ravis de vous informer que nous avons reçu votre soumission d'idée:</p>
         <p style="margin: 0; padding: 12px; background-color: #F4F7F4; border-radius: 6px;"><strong>${safeIdeaTitle}</strong></p>`
      : `<p style="margin: 0 0 16px 0;">${greeting} ${safeName},</p>
         <p style="margin: 0 0 16px 0;">We're excited to let you know that we've received your idea submission:</p>
         <p style="margin: 0; padding: 12px; background-color: #F4F7F4; border-radius: 6px;"><strong>${safeIdeaTitle}</strong></p>`;

    const emailHtml = buildCanonicalEmail({
      headline: lang === 'fr' ? 'Idée Reçue!' : 'Idea Received!',
      body_primary: bodyContent,
      impact_block: {
        title: lang === 'fr' ? 'Prochaines étapes' : 'What happens next',
        items: lang === 'fr' ? [
          'Notre équipe examinera votre soumission sous 7 jours',
          'Vous pourriez être contacté pour des informations supplémentaires',
          'Les nouvelles startups sont éligibles jusqu\'à $500 de financement initial'
        ] : [
          'Our team is reviewing your submission within 7 days',
          'You may be contacted for additional information',
          'New founders are eligible for up to $500 in seed funding'
        ]
      },
      primary_cta: {
        label: lang === 'fr' ? 'Explorer les Cours' : 'Explore Courses',
        url: 'https://acloudforeveryone.org/courses'
      }
    }, lang);

    await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject: subject,
      html: emailHtml,
    });

    console.log("Idea confirmation email sent:", submission.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending confirmation email:", error.message);
    return new Response(
      JSON.stringify({ error: "Failed to send confirmation email" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

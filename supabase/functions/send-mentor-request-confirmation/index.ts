import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildCanonicalEmail, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MentorRequestConfirmationRequest {
  email: string;
  first_name: string;
  language?: EmailLanguage;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Mentor request confirmation email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, first_name, language = 'en' }: MentorRequestConfirmationRequest = await req.json();
    const lang: EmailLanguage = language === 'fr' ? 'fr' : 'en';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email) || email.length > 254) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (first_name && (typeof first_name !== 'string' || first_name.length > 100)) {
      return new Response(
        JSON.stringify({ error: "Invalid name" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    console.log(`Sending mentor request confirmation email to ${email}`);

    const firstName = first_name || (lang === 'fr' ? 'Candidat' : 'Applicant');
    const greeting = lang === 'fr' ? 'Cher' : 'Dear';

    const subject = lang === 'fr' 
      ? 'Nous avons reçu votre candidature de mentor'
      : 'We\'ve Received Your Mentor Application';

    const bodyContent = lang === 'fr'
      ? `<p style="margin: 0 0 16px 0;">${greeting} ${firstName},</p>
         <p style="margin: 0;">Merci de votre candidature pour devenir mentor chez A Cloud for Everyone! Nous sommes ravis que vous souhaitiez aider à façonner la prochaine génération de talents tech africains.</p>`
      : `<p style="margin: 0 0 16px 0;">${greeting} ${firstName},</p>
         <p style="margin: 0;">Thank you for applying to become a mentor at A Cloud for Everyone! We're excited that you want to help shape the next generation of African tech talent.</p>`;

    const emailHtml = buildCanonicalEmail({
      headline: lang === 'fr' ? 'Candidature Reçue!' : 'Application Received!',
      body_primary: bodyContent,
      impact_block: {
        title: lang === 'fr' ? 'Prochaines étapes' : 'What happens next?',
        items: lang === 'fr' ? [
          'Notre équipe examinera votre candidature sous 3-5 jours ouvrables',
          'Vous recevrez un email avec notre décision',
          'Si approuvé, vous pourrez créer des cours et mentorer des étudiants'
        ] : [
          'Our team will review your application within 3-5 business days',
          'You\'ll receive an email notification with our decision',
          'If approved, you\'ll get access to create courses and mentor students'
        ]
      },
      primary_cta: {
        label: lang === 'fr' ? 'Explorer les Cours' : 'Explore Courses',
        url: 'https://acloudforeveryone.org/courses'
      }
    }, lang);

    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject: subject,
      html: emailHtml,
    });

    console.log("Mentor request confirmation email sent:", emailResponse);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    console.error("Error in send-mentor-request-confirmation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

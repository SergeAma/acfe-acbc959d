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

interface NewsletterWelcomeRequest {
  email: string;
  language?: EmailLanguage;
  country_code?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Newsletter welcome email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, language, country_code }: NewsletterWelcomeRequest = await req.json();
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email) || email.length > 254) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Determine language
    let lang: EmailLanguage = 'en';
    if (language && (language === 'en' || language === 'fr')) {
      lang = language;
    } else if (country_code && FRANCOPHONE_COUNTRIES.includes(country_code)) {
      lang = 'fr';
    }
    
    console.log(`Sending newsletter welcome email to ${email} in ${lang}`);

    const subject = lang === 'fr' 
      ? 'Bienvenue au Digest Tech Africain!'
      : 'Welcome to Africa\'s Weekly Tech Digest!';

    const bodyContent = lang === 'fr'
      ? `<p style="margin: 0;">Merci de vous être abonné à notre newsletter! Vous venez de rejoindre une communauté grandissante de passionnés de tech, d'innovateurs et d'acteurs du changement à travers l'Afrique.</p>`
      : `<p style="margin: 0;">Thank you for subscribing to our newsletter! You've just joined a growing community of tech enthusiasts, innovators, and change-makers across Africa.</p>`;

    const emailHtml = buildCanonicalEmail({
      headline: lang === 'fr' ? 'Bienvenue dans Notre Communauté!' : 'Welcome to Our Community!',
      body_primary: bodyContent,
      impact_block: {
        title: lang === 'fr' ? 'À Quoi Vous Attendre' : 'What to Expect',
        items: lang === 'fr' ? [
          'Des analyses sur les startups et tendances tech africaines',
          'Des mises à jour sur les programmes de compétences numériques',
          'L\'actualité des levées de fonds sur le continent',
          'Des ressources éducatives et recommandations de cours'
        ] : [
          'Curated insights on African startups and tech trends',
          'Updates on digital skills programs and opportunities',
          'VC deals and funding news across the continent',
          'Educational resources and course recommendations'
        ]
      },
      primary_cta: {
        label: lang === 'fr' ? 'Créer Votre Compte' : 'Create Your Account',
        url: 'https://acloudforeveryone.org/auth'
      }
    }, lang);

    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject: subject,
      html: emailHtml,
    });

    console.log("Newsletter welcome email sent:", emailResponse);

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
    console.error("Error in send-newsletter-welcome function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

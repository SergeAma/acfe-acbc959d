import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Francophone African countries
const FRANCOPHONE_COUNTRIES = ['SN', 'CI', 'CM', 'CD', 'CG', 'BJ', 'TG', 'BF', 'ML', 'NE', 'TD', 'GA', 'GN', 'CF', 'MG', 'DJ', 'KM', 'RW', 'BI', 'SC', 'MU', 'MA', 'DZ', 'TN'];

type Language = 'en' | 'fr';

const translations: Record<Language, Record<string, string>> = {
  en: {
    subject: "Welcome to Africa's Weekly Tech Digest! 🌍",
    header: "Weekly Africa Tech Digest",
    title: "Welcome to Our Community! 🎉",
    intro: "Thank you for subscribing to our newsletter! You've just joined a growing community of tech enthusiasts, innovators, and change-makers across Africa.",
    expectTitle: "📬 What to Expect:",
    expect1: "Curated insights on African startups and tech trends",
    expect2: "Updates on digital skills programs and opportunities",
    expect3: "VC deals and funding news across the continent",
    expect4: "Educational resources and course recommendations",
    moreTitle: "Want to Do More?",
    moreDesc: "Join A Cloud for Everyone to access our full platform of courses, connect with mentors, and accelerate your digital skills journey.",
    cta: "Create Your Account",
    signoff: "Stay curious,",
    team: "The ACFE Team",
    tagline: "There's a cloud for everyone!",
    rights: "All rights reserved.",
    unsubNote: "You're receiving this because you subscribed to our newsletter.",
  },
  fr: {
    subject: "Bienvenue au Digest Tech Africain Hebdomadaire! 🌍",
    header: "Digest Tech Africain Hebdomadaire",
    title: "Bienvenue dans Notre Communauté! 🎉",
    intro: "Merci de vous être abonné à notre newsletter! Vous venez de rejoindre une communauté grandissante de passionnés de tech, d'innovateurs et d'acteurs du changement à travers l'Afrique.",
    expectTitle: "📬 À Quoi Vous Attendre:",
    expect1: "Des analyses sur les startups et tendances tech africaines",
    expect2: "Des mises à jour sur les programmes de compétences numériques",
    expect3: "L'actualité des levées de fonds sur le continent",
    expect4: "Des ressources éducatives et recommandations de cours",
    moreTitle: "Envie d'Aller Plus Loin?",
    moreDesc: "Rejoignez A Cloud for Everyone pour accéder à notre plateforme complète de cours, connectez-vous avec des mentors et accélérez votre parcours en compétences numériques.",
    cta: "Créer Votre Compte",
    signoff: "Restez curieux,",
    team: "L'Équipe ACFE",
    tagline: "Il y a un cloud pour tout le monde!",
    rights: "Tous droits réservés.",
    unsubNote: "Vous recevez ceci parce que vous vous êtes abonné à notre newsletter.",
  },
};

interface NewsletterWelcomeRequest {
  email: string;
  language?: Language;
  country_code?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Newsletter welcome email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, language, country_code }: NewsletterWelcomeRequest = await req.json();
    
    // Input validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email) || email.length > 254) {
      console.error("Invalid email provided:", email);
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Determine language: explicit > country-based > default to English
    let lang: Language = 'en';
    if (language && (language === 'en' || language === 'fr')) {
      lang = language;
    } else if (country_code && FRANCOPHONE_COUNTRIES.includes(country_code)) {
      lang = 'fr';
    }
    
    const t = translations[lang];
    console.log(`Sending newsletter welcome email to ${email} in ${lang}`);

    const currentYear = new Date().getFullYear();

    const htmlContent = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- ACFE Text Header -->
    <div style="text-align: center; margin-bottom: 0; background-color: #3f3f3f; padding: 24px; border-radius: 12px 12px 0 0;">
      <div style="font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: 4px; margin-bottom: 4px;">ACFE</div>
      <div style="font-size: 12px; color: #d4d4d4; letter-spacing: 2px; text-transform: uppercase;">${t.header}</div>
    </div>
    
    <!-- Main content -->
    <div style="background-color: #ffffff; padding: 40px; border-radius: 0 0 12px 12px;">
      <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px;">${t.title}</h2>
      
      <p style="margin: 0 0 20px 0; line-height: 1.6; color: #333333;">
        ${t.intro}
      </p>
      
      <div style="background-color: #f0fdf4; border-radius: 8px; padding: 25px; margin: 25px 0; border-left: 4px solid #4a5d4a;">
        <h3 style="margin: 0 0 15px 0; color: #166534; font-size: 18px;">${t.expectTitle}</h3>
        <ul style="margin: 0; padding-left: 20px; color: #333333; line-height: 1.8;">
          <li>${t.expect1}</li>
          <li>${t.expect2}</li>
          <li>${t.expect3}</li>
          <li>${t.expect4}</li>
        </ul>
      </div>
      
      <h3 style="margin: 30px 0 15px 0; color: #1a1a1a; font-size: 18px;">${t.moreTitle}</h3>
      <p style="margin: 0 0 20px 0; line-height: 1.6; color: #333333;">
        ${t.moreDesc}
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.acloudforeveryone.org/auth" style="display: inline-block; background-color: #4a5d4a; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 6px;">${t.cta}</a>
      </div>
      
      <p style="margin: 30px 0 0 0; color: #333333;">
        ${t.signoff}<br><br>
        <strong>${t.team}</strong>
      </p>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 0; padding: 24px; background-color: #f8f9fa; border-radius: 0 0 12px 12px;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666;">
        ${t.tagline}
      </p>
      <div style="font-size: 18px; font-weight: 700; color: #3f3f3f; letter-spacing: 2px; margin-bottom: 8px;">ACFE</div>
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #71717a;">
        © ${currentYear} A Cloud for Everyone. ${t.rights}
      </p>
      <p style="margin: 0; font-size: 11px; color: #999999;">
        ${t.unsubNote}
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject: t.subject,
      html: htmlContent,
    });

    console.log("Newsletter welcome email sent:", emailResponse);

    // Log the email
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    console.error("Error in send-newsletter-welcome function:", error);
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

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCanonicalEmail, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  institutionId: string;
  emails: string[];
  institutionName: string;
  institutionSlug: string;
  language?: EmailLanguage;
}

const translations = {
  en: {
    subject: (name: string) => `You're Invited to ${name}'s Career Centre on ACFE`,
    headline: "Career Centre Invitation",
    intro: (name: string) => `<p>You've been invited to join <strong>${name}</strong>'s exclusive Career Development Centre on A Cloud For Everyone.</p><p>As a verified student, you'll have access to exclusive opportunities and resources.</p>`,
    impactTitle: "Your Benefits:",
    item1: "Exclusive job opportunities and career resources",
    item2: "Co-organized events and professional development programs",
    item3: "Direct pathway to Spectrogram Consulting's talent network",
    item4: "Private discussions with your institution's community",
    cta: "Access Career Centre",
  },
  fr: {
    subject: (name: string) => `Vous êtes Invité au Centre de Carrière de ${name} sur ACFE`,
    headline: "Invitation au Centre de Carrière",
    intro: (name: string) => `<p>Vous avez été invité à rejoindre le Centre de Développement de Carrière exclusif de <strong>${name}</strong> sur A Cloud For Everyone.</p><p>En tant qu'étudiant vérifié, vous aurez accès à des opportunités et ressources exclusives.</p>`,
    impactTitle: "Vos Avantages:",
    item1: "Opportunités d'emploi exclusives et ressources de carrière",
    item2: "Événements co-organisés et programmes de développement professionnel",
    item3: "Accès direct au réseau de talents de Spectrogram Consulting",
    item4: "Discussions privées avec la communauté de votre institution",
    cta: "Accéder au Centre de Carrière",
  },
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { institutionId, emails, institutionName, institutionSlug, language = 'en' } = await req.json() as InvitationRequest;
    const lang: EmailLanguage = language === 'fr' ? 'fr' : 'en';
    const t = translations[lang];

    if (!institutionId || !emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid request data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: hasAdminRole } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    const { data: isModerator } = await supabaseClient
      .from('institution_moderators')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!hasAdminRole && !isModerator) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin or Moderator only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const email of emails) {
      const normalizedEmail = email.toLowerCase().trim();
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        errors.push(`Invalid email: ${email}`);
        continue;
      }

      const { data: existing } = await supabaseClient
        .from('institution_students')
        .select('id, status')
        .eq('institution_id', institutionId)
        .eq('email', normalizedEmail)
        .single();

      if (existing && existing.status === 'active') {
        errors.push(`Already a member: ${email}`);
        continue;
      }

      const { data: existingProfile } = await supabaseClient
        .from('profiles')
        .select('id, preferred_language')
        .ilike('email', normalizedEmail)
        .single();

      const shouldAutoActivate = !!existingProfile;
      const inviteStatus = shouldAutoActivate ? 'active' : 'pending';

      // Use recipient's preferred language if they have an account, otherwise use provided language
      const recipientLang: EmailLanguage = existingProfile?.preferred_language === 'fr' ? 'fr' : lang;
      const recipientT = translations[recipientLang];

      if (existing) {
        await supabaseClient
          .from('institution_students')
          .update({ 
            status: inviteStatus, 
            user_id: existingProfile?.id || null,
            invited_at: new Date().toISOString(), 
            invited_by: user.id,
            joined_at: shouldAutoActivate ? new Date().toISOString() : null
          })
          .eq('id', existing.id);
      } else {
        const { error: insertError } = await supabaseClient
          .from('institution_students')
          .insert({
            institution_id: institutionId,
            email: normalizedEmail,
            status: inviteStatus,
            user_id: existingProfile?.id || null,
            invited_by: user.id,
            joined_at: shouldAutoActivate ? new Date().toISOString() : null
          });

        if (insertError) {
          errors.push(`Failed to invite: ${email}`);
          continue;
        }
      }

      const careerCentreUrl = `https://acloudforeveryone.org/career-centre/${institutionSlug}`;
      
      const htmlContent = buildCanonicalEmail({
        headline: recipientT.headline,
        body_primary: recipientT.intro(institutionName),
        impact_block: {
          title: recipientT.impactTitle,
          items: [recipientT.item1, recipientT.item2, recipientT.item3, recipientT.item4],
        },
        primary_cta: {
          label: recipientT.cta,
          url: careerCentreUrl,
        },
      }, recipientLang);

      try {
        const { error: emailError } = await resend.emails.send({
          from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
          to: [normalizedEmail],
          subject: recipientT.subject(institutionName),
          html: htmlContent,
        });

        if (!emailError) {
          sentCount++;
        } else {
          console.error(`Failed to send email to ${email}:`, emailError);
        }
      } catch (emailError) {
        console.error(`Email error for ${email}:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        total: emails.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-institution-invitation:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

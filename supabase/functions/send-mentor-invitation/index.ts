import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildCanonicalEmail, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MentorInvitationRequest {
  email: string;
  message?: string;
  language?: EmailLanguage;
}

const translations = {
  en: {
    subject: "You're Invited to Become a Mentor at A Cloud for Everyone",
    headline: "You're Invited to Become a Mentor!",
    intro: "You have been invited to join <strong>A Cloud for Everyone</strong> as a mentor and share your expertise with learners across Africa.",
    messageLabel: "Personal message from the admin:",
    closing: "As a mentor, you'll be able to create and publish courses, share your knowledge with students, and help shape the next generation of African tech talent.",
    expiry: "This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.",
    impactTitle: "As a mentor, you can:",
    item1: "Create and publish courses",
    item2: "Share your knowledge with students",
    item3: "Help shape the next generation of African tech talent",
    cta: "Accept Invitation",
  },
  fr: {
    subject: "Vous êtes Invité à Devenir Mentor chez A Cloud for Everyone",
    headline: "Vous êtes Invité à Devenir Mentor!",
    intro: "Vous avez été invité à rejoindre <strong>A Cloud for Everyone</strong> en tant que mentor pour partager votre expertise avec les apprenants à travers l'Afrique.",
    messageLabel: "Message personnel de l'administrateur:",
    closing: "En tant que mentor, vous pourrez créer et publier des cours, partager vos connaissances avec les étudiants et contribuer à former la prochaine génération de talents tech africains.",
    expiry: "Cette invitation expire dans 7 jours. Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email.",
    impactTitle: "En tant que mentor, vous pouvez:",
    item1: "Créer et publier des cours",
    item2: "Partager vos connaissances avec les étudiants",
    item3: "Contribuer à former la prochaine génération de talents tech africains",
    cta: "Accepter l'Invitation",
  },
};

const verifyAdminRole = async (req: Request): Promise<{ isAdmin: boolean; userId: string | null; error?: string }> => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.log("No authorization header found");
    return { isAdmin: false, userId: null, error: 'Missing authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    console.log("No token found in authorization header");
    return { isAdmin: false, userId: null, error: 'Missing token' };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError) {
    console.log("Auth error:", authError.message);
    return { isAdmin: false, userId: null, error: 'Invalid or expired token' };
  }
  
  if (!user) {
    console.log("No user found for token");
    return { isAdmin: false, userId: null, error: 'Invalid or expired token' };
  }

  console.log("User authenticated:", user.id);
  
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (roleError) {
    console.log("Role check error:", roleError.message);
    return { isAdmin: false, userId: user.id, error: 'Failed to check admin role' };
  }

  if (!roleData) {
    console.log("User is not an admin");
    return { isAdmin: false, userId: user.id, error: 'User is not an admin' };
  }

  console.log("Admin role verified for user:", user.id);
  return { isAdmin: true, userId: user.id };
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Send mentor invitation function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { isAdmin, userId, error: authError } = await verifyAdminRole(req);
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

    const { email, message, language = 'en' }: MentorInvitationRequest = await req.json();
    const lang: EmailLanguage = language === 'fr' ? 'fr' : 'en';
    const t = translations[lang];

    console.log(`Admin ${userId} sending mentor invitation to ${email}`);

    const { data: existingInvitation } = await supabase
      .from('mentor_invitations')
      .select('id, status')
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvitation) {
      return new Response(
        JSON.stringify({ error: 'A pending invitation already exists for this email' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: invitation, error: insertError } = await supabase
      .from('mentor_invitations')
      .insert({ email, invited_by: userId })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create invitation:", insertError);
      throw new Error("Failed to create invitation");
    }

    const inviteUrl = `${Deno.env.get("SITE_URL") || "https://acloudforeveryone.org"}/accept-mentor-invite?token=${invitation.token}`;

    let bodyContent = `<p>${lang === 'fr' ? 'Bonjour' : 'Hello'},</p><p>${t.intro}</p>`;
    if (message) {
      bodyContent += `<p style="background: #F4F7F4; padding: 15px; border-left: 4px solid #4B5C4B; border-radius: 0 6px 6px 0;"><em>"${message}"</em></p>`;
    }
    bodyContent += `<p>${t.closing}</p><p style="font-size: 13px; color: #666;">${t.expiry}</p>`;

    const htmlContent = buildCanonicalEmail({
      headline: t.headline,
      body_primary: bodyContent,
      impact_block: {
        title: t.impactTitle,
        items: [t.item1, t.item2, t.item3],
      },
      primary_cta: {
        label: t.cta,
        url: inviteUrl,
      },
    }, lang);

    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject: t.subject,
      html: htmlContent,
    });

    console.log("Mentor invitation email sent:", emailResponse);

    await supabase.from('email_logs').insert({
      subject: "Mentor Invitation",
      status: 'sent',
      sent_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ success: true, invitation }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-mentor-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

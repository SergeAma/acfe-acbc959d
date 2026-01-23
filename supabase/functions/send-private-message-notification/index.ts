import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildCanonicalEmail } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  messageId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-private-message-notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { messageId }: NotificationRequest = await req.json();

    if (!messageId) {
      return new Response(
        JSON.stringify({ error: "Missing messageId" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch message details
    const { data: message, error: messageError } = await supabase
      .from("private_messages")
      .select("*")
      .eq("id", messageId)
      .single();

    if (messageError || !message) {
      console.error("Message not found:", messageError);
      return new Response(
        JSON.stringify({ error: "Message not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch sender profile
    const { data: sender } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", message.sender_id)
      .single();

    // Fetch recipient profile with email
    const { data: recipient } = await supabase
      .from("profiles")
      .select("full_name, email, preferred_language")
      .eq("id", message.recipient_id)
      .single();

    if (!recipient?.email) {
      console.error("Recipient email not found");
      return new Response(
        JSON.stringify({ error: "Recipient email not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create in-app notification (moved from frontend for reliability)
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: message.recipient_id,
        message: `New private message from ${sender?.full_name || 'a mentor'}`,
        link: '/dashboard?tab=messages',
        action_type: 'new_private_message',
        action_reference_id: message.id,
      });

    if (notificationError) {
      console.error("Failed to create notification:", notificationError);
      // Continue with email - notification failure shouldn't block email
    } else {
      console.log("In-app notification created for message:", messageId);
    }

    const senderName = sender?.full_name || "A mentor";
    const recipientName = recipient?.full_name || "there";
    const isEnglish = recipient?.preferred_language !== "fr";

    // Truncate message preview
    const messagePreview = message.content.length > 100 
      ? message.content.substring(0, 100) + "..." 
      : message.content;

    // Build email content
    const subject = isEnglish
      ? `New message from ${senderName}`
      : `Nouveau message de ${senderName}`;

    const emailContent = isEnglish
      ? `
        <p>Hi ${recipientName},</p>
        <p>You have a new private message from <strong>${senderName}</strong>:</p>
        <blockquote style="border-left: 3px solid #4a5d4a; padding-left: 15px; margin: 20px 0; color: #666;">
          ${messagePreview}
        </blockquote>
        <p>Log in to your dashboard to view and respond to this message.</p>
      `
      : `
        <p>Bonjour ${recipientName},</p>
        <p>Vous avez un nouveau message privé de <strong>${senderName}</strong>:</p>
        <blockquote style="border-left: 3px solid #4a5d4a; padding-left: 15px; margin: 20px 0; color: #666;">
          ${messagePreview}
        </blockquote>
        <p>Connectez-vous à votre tableau de bord pour voir et répondre à ce message.</p>
      `;

    const ctaText = isEnglish ? "View Message" : "Voir le Message";
    const ctaUrl = "https://www.acloudforeveryone.org/dashboard?tab=messages";

    const language = recipient?.preferred_language === 'fr' ? 'fr' : 'en';
    
    const htmlContent = buildCanonicalEmail({
      headline: subject,
      body_primary: emailContent,
      primary_cta: {
        label: ctaText,
        url: ctaUrl,
      },
    }, language);

    // Send email
    const emailResponse = await resend.emails.send({
      from: "ACFE <noreply@acloudforeveryone.org>",
      to: [recipient.email],
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: (emailResponse as any).id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-private-message-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildCanonicalEmail, EMAIL_DESIGN_TOKENS } from "../_shared/email-template.ts";
import { escapeHtml } from "../_shared/html-escape.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EventConfirmationRequest {
  event_id: string;
  user_id: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event_id, user_id }: EventConfirmationRequest = await req.json();

    if (!event_id || !user_id) {
      throw new Error("Missing event_id or user_id");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found");
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user_id)
      .single();

    if (profileError || !profile?.email) {
      throw new Error("User profile not found");
    }

    // Mark confirmation as sent
    await supabase
      .from("event_registrations")
      .update({ confirmation_sent_at: new Date().toISOString() })
      .eq("event_id", event_id)
      .eq("user_id", user_id);

    // Format event details
    const eventDate = new Date(event.event_date);
    const formattedDate = eventDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    
    const locationInfo = event.event_type === "online"
      ? `Online Event`
      : `${escapeHtml(event.location_name || "In Person")}${event.location_address ? `, ${escapeHtml(event.location_address)}` : ""}`;

    const firstName = profile.full_name?.split(" ")[0] || "there";

    // Build email content using correct API
    const eventUrl = `https://acfe.lovable.app/events/${event.slug}`;
    
    const bodyContent = `
      <p style="margin: 0 0 16px 0;">Hi ${escapeHtml(firstName)},</p>
      
      <p style="margin: 0 0 16px 0;">You're officially registered for <strong>${escapeHtml(event.title)}</strong>! We can't wait to see you there.</p>
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${EMAIL_DESIGN_TOKENS.BACKGROUND_LIGHT}; border-radius: ${EMAIL_DESIGN_TOKENS.BORDER_RADIUS}; margin: 24px 0;">
        <tr>
          <td style="padding: 24px;">
            <p style="margin: 0 0 16px 0; font-weight: 600; color: ${EMAIL_DESIGN_TOKENS.PRIMARY_COLOR};">📅 Event Details</p>
            <p style="margin: 8px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 8px 0;"><strong>Time:</strong> ${escapeHtml(event.event_time)}</p>
            <p style="margin: 8px 0;"><strong>Location:</strong> ${locationInfo}</p>
          </td>
        </tr>
      </table>
      
      <p style="margin: 0 0 8px 0;"><strong>What to expect:</strong></p>
      <ul style="margin: 0 0 16px 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Engaging conversations with like-minded individuals</li>
        <li style="margin-bottom: 8px;">Opportunities to connect with industry professionals</li>
        <li style="margin-bottom: 8px;">Insights and knowledge sharing in a welcoming environment</li>
      </ul>
      
      <p style="margin: 0 0 16px 0;">Mark your calendar and get ready for an inspiring experience!</p>
      
      <p style="color: ${EMAIL_DESIGN_TOKENS.TEXT_MUTED}; font-size: 14px; margin-top: 24px;">
        We'll send you a reminder as the event approaches. If you have any questions, reply to this email.
      </p>
    `;

    const html = buildCanonicalEmail({
      headline: `You're Registered! 🎉`,
      body_primary: bodyContent,
      primary_cta: {
        label: "View Event Details",
        url: eventUrl,
      },
    });

    const emailResponse = await resend.emails.send({
      from: "ACFE Events <events@acloudforeveryone.org>",
      to: [profile.email],
      subject: `You're registered for ${event.title}!`,
      html,
    });

    console.log("Event confirmation email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending event confirmation:", message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

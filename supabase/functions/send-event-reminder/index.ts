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

type ReminderType = "5day" | "2day" | "dayof";

interface SendReminderRequest {
  event_id: string;
  reminder_type: ReminderType;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event_id, reminder_type }: SendReminderRequest = await req.json();

    if (!event_id || !reminder_type) {
      throw new Error("Missing event_id or reminder_type");
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

    // Check if this reminder type is enabled
    const reminderFieldMap: Record<ReminderType, string> = {
      "5day": "send_5day_reminder",
      "2day": "send_2day_reminder",
      "dayof": "send_dayof_reminder",
    };
    const reminderField = reminderFieldMap[reminder_type];
    if (!event[reminderField]) {
      console.log(`Reminder type ${reminder_type} is disabled for this event`);
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get registrations that haven't received this reminder
    const sentFieldMap: Record<ReminderType, string> = {
      "5day": "reminder_5day_sent_at",
      "2day": "reminder_2day_sent_at",
      "dayof": "reminder_dayof_sent_at",
    };
    const sentField = sentFieldMap[reminder_type];
    
    const { data: registrations, error: regError } = await supabase
      .from("event_registrations")
      .select("id, user_id")
      .eq("event_id", event_id)
      .is(sentField, null);

    if (regError) {
      throw new Error(`Error fetching registrations: ${regError.message}`);
    }

    if (!registrations || registrations.length === 0) {
      console.log("No registrations to send reminders to");
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch profiles for these registrations
    const userIds = registrations.map(r => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Format event details
    const eventDate = new Date(event.event_date);
    const formattedDate = eventDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const locationInfo = event.event_type === "online"
      ? `Online Event${event.event_link ? "" : ""}`
      : `${escapeHtml(event.location_name || "In Person")}${event.location_address ? `, ${escapeHtml(event.location_address)}` : ""}`;

    const eventUrl = `https://acfe.lovable.app/events/${event.slug}`;

    let sentCount = 0;

    // Send emails with delay to respect rate limits
    for (const registration of registrations) {
      const profile = profileMap.get(registration.user_id);
      if (!profile?.email) continue;

      const firstName = profile.full_name?.split(" ")[0] || "there";
      const { subject, headline, bodyContent } = getReminderContent(
        reminder_type,
        event,
        formattedDate,
        locationInfo,
        eventUrl,
        firstName
      );

      const html = buildCanonicalEmail({
        headline,
        body_primary: bodyContent,
        primary_cta: {
          label: reminder_type === "dayof" && event.event_type === "online" && event.event_link 
            ? "Join Event Now" 
            : "View Event Details",
          url: reminder_type === "dayof" && event.event_type === "online" && event.event_link 
            ? event.event_link 
            : eventUrl,
        },
      });

      try {
        await resend.emails.send({
          from: "ACFE Events <events@acloudforeveryone.org>",
          to: [profile.email],
          subject: subject.replace("{eventTitle}", event.title),
          html,
        });

        // Mark as sent
        await supabase
          .from("event_registrations")
          .update({ [sentField]: new Date().toISOString() })
          .eq("id", registration.id);

        sentCount++;

        // Rate limit: 600ms between emails
        await new Promise((resolve) => setTimeout(resolve, 600));
      } catch (emailError) {
        console.error(`Failed to send to ${profile.email}:`, emailError);
      }
    }

    console.log(`Sent ${sentCount} ${reminder_type} reminders for event ${event_id}`);

    return new Response(JSON.stringify({ sent: sentCount }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending event reminders:", message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

function getReminderContent(
  type: ReminderType,
  event: Record<string, unknown>,
  formattedDate: string,
  locationInfo: string,
  eventUrl: string,
  firstName: string
): { subject: string; headline: string; bodyContent: string } {
  const eventTitle = escapeHtml(String(event.title || ""));
  const eventTime = escapeHtml(String(event.event_time || ""));
  
  switch (type) {
    case "5day":
      return {
        subject: "ACFE is excited to meet you soon!",
        headline: "See You in 5 Days! 🌟",
        bodyContent: `
          <p style="margin: 0 0 16px 0;">Hi ${escapeHtml(firstName)},</p>
          
          <p style="margin: 0 0 16px 0;">We're just <strong>5 days away</strong> from <strong>${eventTitle}</strong>, and we couldn't be more excited to meet you!</p>
          
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${EMAIL_DESIGN_TOKENS.BACKGROUND_LIGHT}; border-radius: ${EMAIL_DESIGN_TOKENS.BORDER_RADIUS}; margin: 24px 0;">
            <tr>
              <td style="padding: 24px;">
                <p style="margin: 8px 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
                <p style="margin: 8px 0;"><strong>⏰ Time:</strong> ${eventTime}</p>
                <p style="margin: 8px 0;"><strong>📍 Location:</strong> ${locationInfo}</p>
              </td>
            </tr>
          </table>
          
          <p style="margin: 0 0 16px 0;"><strong>Looking forward to great conversations about tech in Africa!</strong></p>
          
          <p style="margin: 0 0 16px 0;">Get ready to connect with amazing people, share ideas, and be inspired. This is your chance to expand your network and learn from industry leaders.</p>
        `,
      };

    case "2day":
      return {
        subject: "Just 2 days until {eventTitle}!",
        headline: "Almost Time! ⏳",
        bodyContent: `
          <p style="margin: 0 0 16px 0;">Hi ${escapeHtml(firstName)},</p>
          
          <p style="margin: 0 0 16px 0;">We're just <strong>2 days away</strong> from <strong>${eventTitle}</strong>!</p>
          
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${EMAIL_DESIGN_TOKENS.BACKGROUND_LIGHT}; border-radius: ${EMAIL_DESIGN_TOKENS.BORDER_RADIUS}; margin: 24px 0;">
            <tr>
              <td style="padding: 24px;">
                <p style="margin: 8px 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
                <p style="margin: 8px 0;"><strong>⏰ Time:</strong> ${eventTime}</p>
                <p style="margin: 8px 0;"><strong>📍 Location:</strong> ${locationInfo}</p>
              </td>
            </tr>
          </table>
          
          <p style="margin: 0 0 8px 0;"><strong>Final prep tips:</strong></p>
          <ul style="margin: 0 0 16px 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;">Prepare a few conversation starters</li>
            <li style="margin-bottom: 8px;">Bring business cards if you have them</li>
            <li style="margin-bottom: 8px;">Come with an open mind and ready to connect</li>
            ${event.event_type === "in_person" ? '<li style="margin-bottom: 8px;">Check the venue location and plan your route</li>' : ""}
          </ul>
          
          <p style="margin: 0 0 16px 0;">We're excited to see you there!</p>
        `,
      };

    case "dayof":
      return {
        subject: "Today's the day - see you at {eventTitle}!",
        headline: "It's Happening Today! 🎉",
        bodyContent: `
          <p style="margin: 0 0 16px 0;">Hi ${escapeHtml(firstName)},</p>
          
          <p style="margin: 0 0 16px 0;"><strong>${eventTitle}</strong> is happening <strong>TODAY</strong>!</p>
          
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${EMAIL_DESIGN_TOKENS.BACKGROUND_LIGHT}; border: 2px solid ${EMAIL_DESIGN_TOKENS.PRIMARY_COLOR}; border-radius: ${EMAIL_DESIGN_TOKENS.BORDER_RADIUS}; margin: 24px 0;">
            <tr>
              <td style="padding: 24px;">
                <p style="margin: 8px 0; font-size: 18px;"><strong>⏰ ${eventTime}</strong></p>
                <p style="margin: 8px 0;"><strong>📍 ${locationInfo}</strong></p>
              </td>
            </tr>
          </table>
          
          <p style="margin: 0 0 16px 0;">We can't wait to see you! Get ready for inspiring conversations and meaningful connections.</p>
          
          <p style="color: ${EMAIL_DESIGN_TOKENS.TEXT_MUTED}; font-size: 14px; margin-top: 24px;">
            Questions? Reply to this email and we'll help you out.
          </p>
        `,
      };
  }
}

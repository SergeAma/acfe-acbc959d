import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// This function is called by a cron job to process scheduled event reminders
serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // Calculate date ranges
    const in5Days = new Date(now);
    in5Days.setDate(in5Days.getDate() + 5);
    const in5DaysStr = in5Days.toISOString().split("T")[0];

    const in2Days = new Date(now);
    in2Days.setDate(in2Days.getDate() + 2);
    const in2DaysStr = in2Days.toISOString().split("T")[0];

    // Fetch all published events that are upcoming
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, event_date, send_5day_reminder, send_2day_reminder, send_dayof_reminder")
      .eq("status", "published")
      .gte("event_date", today);

    if (eventsError) {
      throw new Error(`Error fetching events: ${eventsError.message}`);
    }

    const results: Array<{ event_id: string; type: string; result?: unknown; error?: string }> = [];

    for (const event of events || []) {
      // Check which reminders need to be sent
      
      // Day-of reminder (check if event is today and it's morning - before 10am)
      if (event.event_date === today && event.send_dayof_reminder && now.getHours() < 10) {
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/send-event-reminder`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              event_id: event.id,
              reminder_type: "dayof",
            }),
          });
          const result = await response.json();
          results.push({ event_id: event.id, type: "dayof", result });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          results.push({ event_id: event.id, type: "dayof", error: message });
        }
      }

      // 2-day reminder
      if (event.event_date === in2DaysStr && event.send_2day_reminder) {
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/send-event-reminder`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              event_id: event.id,
              reminder_type: "2day",
            }),
          });
          const result = await response.json();
          results.push({ event_id: event.id, type: "2day", result });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          results.push({ event_id: event.id, type: "2day", error: message });
        }
      }

      // 5-day reminder
      if (event.event_date === in5DaysStr && event.send_5day_reminder) {
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/send-event-reminder`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              event_id: event.id,
              reminder_type: "5day",
            }),
          });
          const result = await response.json();
          results.push({ event_id: event.id, type: "5day", result });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          results.push({ event_id: event.id, type: "5day", error: message });
        }
      }
    }

    console.log("Event reminder processing complete:", results);

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing event reminders:", message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

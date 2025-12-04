import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Processing scheduled newsletters...");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get scheduled newsletters that are due
    const now = new Date().toISOString();
    const { data: scheduledNewsletters, error: fetchError } = await supabase
      .from("scheduled_newsletters")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now);

    if (fetchError) {
      console.error("Error fetching scheduled newsletters:", fetchError);
      throw fetchError;
    }

    if (!scheduledNewsletters || scheduledNewsletters.length === 0) {
      console.log("No scheduled newsletters to process");
      return new Response(
        JSON.stringify({ message: "No scheduled newsletters to process" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${scheduledNewsletters.length} newsletters to send`);

    for (const newsletter of scheduledNewsletters) {
      console.log(`Processing newsletter: ${newsletter.id} - ${newsletter.subject}`);

      // Mark as processing
      await supabase
        .from("scheduled_newsletters")
        .update({ status: "processing" })
        .eq("id", newsletter.id);

      try {
        // Get all contacts
        const { data: contacts, error: contactsError } = await supabase
          .from("contacts")
          .select("id, email, first_name, last_name");

        if (contactsError) throw contactsError;

        if (!contacts || contacts.length === 0) {
          console.log("No contacts to send to");
          await supabase
            .from("scheduled_newsletters")
            .update({ status: "completed", sent_at: new Date().toISOString(), recipient_count: 0 })
            .eq("id", newsletter.id);
          continue;
        }

        // Send emails
        let sentCount = 0;
        for (const contact of contacts) {
          let personalizedHtml = newsletter.html_content
            .replace(/\{\{first_name\}\}/g, contact.first_name || "Subscriber")
            .replace(/\{\{last_name\}\}/g, contact.last_name || "")
            .replace(/\{\{email\}\}/g, contact.email);

          try {
            await resend.emails.send({
              from: "A Cloud for Everyone <newsletter@acloudforeveryone.org>",
              to: [contact.email],
              subject: newsletter.subject,
              html: personalizedHtml,
            });

            // Log the email
            await supabase.from("email_logs").insert({
              subject: newsletter.subject,
              contact_id: contact.id,
              status: "sent",
              sent_at: new Date().toISOString(),
            });

            sentCount++;
            console.log(`Email sent to ${contact.email}`);
          } catch (emailError: any) {
            console.error(`Failed to send email to ${contact.email}:`, emailError);
            await supabase.from("email_logs").insert({
              subject: newsletter.subject,
              contact_id: contact.id,
              status: "failed",
              error_message: emailError.message,
            });
          }
        }

        // Mark as completed
        await supabase
          .from("scheduled_newsletters")
          .update({
            status: "completed",
            sent_at: new Date().toISOString(),
            recipient_count: sentCount,
          })
          .eq("id", newsletter.id);

        console.log(`Newsletter ${newsletter.id} completed. Sent to ${sentCount} recipients.`);
      } catch (error: any) {
        console.error(`Error processing newsletter ${newsletter.id}:`, error);
        await supabase
          .from("scheduled_newsletters")
          .update({ status: "failed" })
          .eq("id", newsletter.id);
      }
    }

    return new Response(
      JSON.stringify({ message: `Processed ${scheduledNewsletters.length} newsletters` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in process-scheduled-newsletters:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);

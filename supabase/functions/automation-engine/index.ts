import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface AutomationTrigger {
  trigger_type: string;
  user_data: {
    id: string;
    email: string;
    full_name?: string;
  };
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { trigger_type, user_data }: AutomationTrigger = await req.json();
    
    console.log(`Processing automation trigger: ${trigger_type} for user: ${user_data.email}`);

    // Find active automation rules for this trigger type
    const { data: rules, error: rulesError } = await supabase
      .from("automation_rules")
      .select(`
        *,
        automation_actions (
          id,
          action_type,
          action_config,
          action_order
        )
      `)
      .eq("trigger_type", trigger_type)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (rulesError) {
      console.error("Error fetching automation rules:", rulesError);
      throw rulesError;
    }

    if (!rules || rules.length === 0) {
      console.log(`No active automation rules found for trigger: ${trigger_type}`);
      return new Response(
        JSON.stringify({ message: "No automation rules found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Process each automation rule
    for (const rule of rules) {
      console.log(`Processing rule: ${rule.name}`);
      
      // Create execution record
      const { data: execution, error: execError } = await supabase
        .from("automation_executions")
        .insert({
          rule_id: rule.id,
          status: "processing",
        })
        .select()
        .single();

      if (execError) {
        console.error("Error creating execution record:", execError);
        continue;
      }

      try {
        let contactId: string | null = null;

        // Sort actions by order
        const actions = (rule.automation_actions || []).sort(
          (a: any, b: any) => a.action_order - b.action_order
        );

        // Execute actions in order
        for (const action of actions) {
          console.log(`Executing action: ${action.action_type}`);

          switch (action.action_type) {
            case "create_contact":
              // Create or update contact
              const { data: existingContact } = await supabase
                .from("contacts")
                .select("id")
                .eq("email", user_data.email)
                .maybeSingle();

              if (existingContact) {
                contactId = existingContact.id;
                console.log(`Contact already exists: ${contactId}`);
              } else {
                const { data: newContact, error: contactError } = await supabase
                  .from("contacts")
                  .insert({
                    email: user_data.email,
                    first_name: user_data.full_name?.split(" ")[0] || "",
                    last_name: user_data.full_name?.split(" ").slice(1).join(" ") || "",
                    source: trigger_type,
                    user_id: user_data.id,
                  })
                  .select()
                  .single();

                if (contactError) {
                  console.error("Error creating contact:", contactError);
                  throw contactError;
                }

                contactId = newContact.id;
                console.log(`Created new contact: ${contactId}`);
              }

              // Update execution with contact_id
              await supabase
                .from("automation_executions")
                .update({ contact_id: contactId })
                .eq("id", execution.id);
              break;

            case "add_tag":
              if (!contactId) {
                console.error("Cannot add tag: No contact ID available");
                break;
              }

              const tagName = action.action_config.tag_name;
              
              // Get or create tag
              const { data: existingTag } = await supabase
                .from("tags")
                .select("id")
                .eq("name", tagName)
                .maybeSingle();

              const tagId = existingTag?.id || (await supabase
                .from("tags")
                .insert({ name: tagName })
                .select("id")
                .single()).data?.id;

              if (tagId) {
                // Add tag to contact
                await supabase
                  .from("contact_tags")
                  .insert({ contact_id: contactId, tag_id: tagId })
                  .select();
                console.log(`Added tag "${tagName}" to contact`);
              }
              break;

            case "send_email":
              if (!contactId) {
                console.error("Cannot send email: No contact ID available");
                break;
              }

              const templateName = action.action_config.template_name;
              
              // Fetch email template
              const { data: template, error: templateError } = await supabase
                .from("email_templates")
                .select("*")
                .eq("name", templateName)
                .single();

              if (templateError || !template) {
                console.error(`Email template "${templateName}" not found`);
                break;
              }

              // Replace variables in template
              let htmlContent = template.html_content;
              const variables = template.variables || [];
              
              // Replace common variables
              const replacements: Record<string, string> = {
                first_name: user_data.full_name?.split(" ")[0] || "there",
                full_name: user_data.full_name || "there",
                email: user_data.email,
                dashboard_url: `${Deno.env.get("SUPABASE_URL")?.replace("https://", "https://")}/dashboard`,
              };

              for (const [key, value] of Object.entries(replacements)) {
                htmlContent = htmlContent.replace(new RegExp(`{{${key}}}`, "g"), value);
              }

              // Send email via Resend
              const { data: emailData, error: emailError } = await resend.emails.send({
                from: "A Cloud for Everyone <onboarding@resend.dev>",
                to: [user_data.email],
                subject: template.subject,
                html: htmlContent,
              });

              if (emailError) {
                console.error("Error sending email:", emailError);
                throw emailError;
              }

              console.log(`Email sent successfully to ${user_data.email}`);

              // Log email
              await supabase.from("email_logs").insert({
                contact_id: contactId,
                template_id: template.id,
                subject: template.subject,
                status: "sent",
              });
              break;

            default:
              console.log(`Unknown action type: ${action.action_type}`);
          }
        }

        // Mark execution as completed
        await supabase
          .from("automation_executions")
          .update({ 
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", execution.id);

        console.log(`Successfully completed automation rule: ${rule.name}`);
      } catch (error: any) {
        console.error(`Error executing automation rule ${rule.name}:`, error);
        
        // Mark execution as failed
        await supabase
          .from("automation_executions")
          .update({ 
            status: "failed",
            error_message: error.message,
            completed_at: new Date().toISOString(),
          })
          .eq("id", execution.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Automation processed successfully",
        rules_processed: rules.length,
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  } catch (error: any) {
    console.error("Automation engine error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
});
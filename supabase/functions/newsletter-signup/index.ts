import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      console.error("Invalid email format:", email);
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    console.log("Processing newsletter signup for:", trimmedEmail);

    // Use service role to insert contact (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: insertError } = await supabaseAdmin
      .from("contacts")
      .insert({ 
        email: trimmedEmail, 
        source: "newsletter_signup" 
      });

    if (insertError) {
      // Handle duplicate email gracefully (unique constraint violation)
      if (insertError.code === "23505") {
        console.log("Email already subscribed:", trimmedEmail);
        return new Response(
          JSON.stringify({ success: true, alreadySubscribed: true }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      console.error("Insert error:", insertError);
      throw insertError;
    }

    console.log("Contact created successfully for:", trimmedEmail);

    // Send welcome email
    try {
      await supabaseAdmin.functions.invoke("send-newsletter-welcome", {
        body: { email: trimmedEmail }
      });
      console.log("Welcome email triggered for:", trimmedEmail);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Don't fail the signup if email fails
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Newsletter signup error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to subscribe" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

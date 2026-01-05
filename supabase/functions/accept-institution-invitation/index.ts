import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    
    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { institutionId } = await req.json();

    if (!institutionId) {
      return new Response(JSON.stringify({ error: "Institution ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has a pending invitation for this institution
    const { data: invitation, error: inviteError } = await supabaseClient
      .from('institution_students')
      .select('*')
      .eq('institution_id', institutionId)
      .eq('email', user.email)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invitation) {
      // Check if institution has an email domain and user's email matches
      const { data: institution } = await supabaseClient
        .from('institutions')
        .select('email_domain')
        .eq('id', institutionId)
        .single();

      if (institution?.email_domain && user.email?.endsWith(`@${institution.email_domain}`)) {
        // Auto-verify based on email domain
        const { error: insertError } = await supabaseClient
          .from('institution_students')
          .insert({
            institution_id: institutionId,
            user_id: user.id,
            email: user.email,
            status: 'active',
            joined_at: new Date().toISOString(),
          });

        if (insertError) {
          // Might already exist, try to update
          await supabaseClient
            .from('institution_students')
            .update({
              user_id: user.id,
              status: 'active',
              joined_at: new Date().toISOString(),
            })
            .eq('institution_id', institutionId)
            .eq('email', user.email);
        }

        return new Response(
          JSON.stringify({ success: true, message: "Access granted via email domain" }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: "No invitation found for this email" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Activate the invitation
    const { error: updateError } = await supabaseClient
      .from('institution_students')
      .update({
        user_id: user.id,
        status: 'active',
        joined_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, message: "Invitation accepted" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in accept-institution-invitation:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

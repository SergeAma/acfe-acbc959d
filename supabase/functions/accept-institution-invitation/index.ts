import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyUser, corsHeaders } from "../_shared/auth.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication using shared middleware
    const { user, supabase } = await verifyUser(req);

    const { institutionId } = await req.json();

    if (!institutionId) {
      return new Response(JSON.stringify({ error: "Institution ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has a pending invitation for this institution
    const { data: invitation, error: inviteError } = await supabase
      .from('institution_students')
      .select('*')
      .eq('institution_id', institutionId)
      .eq('email', user.email)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invitation) {
      // Check if institution has an email domain and user's email matches
      const { data: institution } = await supabase
        .from('institutions')
        .select('email_domain')
        .eq('id', institutionId)
        .single();

      if (institution?.email_domain && user.email?.endsWith(`@${institution.email_domain}`)) {
        // Auto-verify based on email domain
        const { error: insertError } = await supabase
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
          await supabase
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
    const { error: updateError } = await supabase
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
    
    // Return 401 for auth errors
    const status = message.includes('authorization') || 
                   message.includes('token') ? 401 : 500;
    
    return new Response(
      JSON.stringify({ error: message }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

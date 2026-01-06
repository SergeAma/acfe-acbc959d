import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-SESSION-PRICE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authenticate admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .rpc('get_user_role', { _user_id: user.id });
    
    if (roleError || roleData !== 'admin') {
      throw new Error("Only admins can update session pricing");
    }
    logStep("Admin verified");

    const { priceCents, enabled } = await req.json();
    
    if (priceCents !== undefined && (isNaN(priceCents) || priceCents < 100)) {
      throw new Error("Price must be at least $1.00");
    }

    logStep("Updating session price", { priceCents, enabled });

    // Get current settings
    const { data: currentSettings } = await supabaseClient
      .from('platform_settings')
      .select('setting_value')
      .eq('setting_key', 'mentorship_session_price')
      .single();

    const currentValue = (currentSettings?.setting_value || { price_cents: 3000, enabled: true }) as { price_cents: number; enabled: boolean };

    const newSettings = {
      price_cents: priceCents !== undefined ? priceCents : currentValue.price_cents,
      enabled: enabled !== undefined ? enabled : currentValue.enabled,
    };

    const { error: updateError } = await supabaseClient
      .from('platform_settings')
      .upsert({
        setting_key: 'mentorship_session_price',
        setting_value: newSettings,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'setting_key',
      });

    if (updateError) throw updateError;

    logStep("Session price updated successfully", newSettings);

    return new Response(JSON.stringify({ 
      success: true,
      ...newSettings
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

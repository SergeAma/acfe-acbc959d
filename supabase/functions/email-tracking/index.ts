import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 1x1 transparent GIF pixel
const TRACKING_PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 
  0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 
  0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 
  0x01, 0x00, 0x3b
]);

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const action = pathParts[pathParts.length - 1]; // 'open' or 'click'
  
  console.log(`Email tracking: ${action}, URL: ${req.url}`);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const logId = url.searchParams.get('id');
    const redirectUrl = url.searchParams.get('url');

    if (!logId) {
      console.error("Missing log ID");
      if (action === 'open') {
        return new Response(TRACKING_PIXEL, {
          headers: { "Content-Type": "image/gif", ...corsHeaders },
        });
      }
      return new Response("Missing ID", { status: 400 });
    }

    console.log(`Processing ${action} tracking for log ID: ${logId}`);

    if (action === 'open') {
      // Record email open
      const { error } = await supabase
        .from('email_logs')
        .update({ opened_at: new Date().toISOString() })
        .eq('id', logId)
        .is('opened_at', null); // Only update if not already opened

      if (error) {
        console.error("Error recording open:", error);
      } else {
        console.log(`Recorded open for log ID: ${logId}`);
      }

      // Return tracking pixel
      return new Response(TRACKING_PIXEL, {
        headers: { 
          "Content-Type": "image/gif",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
          ...corsHeaders 
        },
      });
    } 
    
    if (action === 'click') {
      // Record email click
      const { error } = await supabase
        .from('email_logs')
        .update({ clicked_at: new Date().toISOString() })
        .eq('id', logId)
        .is('clicked_at', null); // Only update if not already clicked

      if (error) {
        console.error("Error recording click:", error);
      } else {
        console.log(`Recorded click for log ID: ${logId}`);
      }

      // Redirect to actual URL
      if (redirectUrl) {
        const decodedUrl = decodeURIComponent(redirectUrl);
        console.log(`Redirecting to: ${decodedUrl}`);
        return new Response(null, {
          status: 302,
          headers: { 
            "Location": decodedUrl,
            ...corsHeaders 
          },
        });
      }

      return new Response("Click recorded", { 
        status: 200,
        headers: corsHeaders 
      });
    }

    return new Response("Invalid action", { status: 400, headers: corsHeaders });
  } catch (error: any) {
    console.error("Error in email-tracking function:", error);
    
    // Still return pixel for open tracking even on error
    if (action === 'open') {
      return new Response(TRACKING_PIXEL, {
        headers: { "Content-Type": "image/gif", ...corsHeaders },
      });
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

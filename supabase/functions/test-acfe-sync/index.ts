import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TEST-ACFE-SYNC] ${step}${detailsStr}`);
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sharedSecret = Deno.env.get("ACFE_SHARED_SECRET");

    if (!sharedSecret) {
      throw new Error("ACFE_SHARED_SECRET not configured");
    }

    const { action, testEmail } = await req.json();
    logStep("Action requested", { action, testEmail });

    if (action === "generate-token") {
      // Generate a test token with sample profile data
      const email = testEmail || "test-student@acfe.africa";
      
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const payload = {
        // Core identity
        email: email,
        full_name: "Test Student",
        avatar_url: "",
        bio: "A passionate learner exploring fraud examination.",
        
        // Professional info
        university: "University of Cape Town",
        country: "South Africa",
        skills: ["Fraud Examination", "Financial Analysis", "Risk Management"],
        companies_worked_for: ["Big Four Accounting", "Local Bank"],
        
        // Social links
        linkedin_url: "https://linkedin.com/in/teststudent",
        twitter_url: "",
        instagram_url: "",
        github_url: "",
        website_url: "",
        
        // Certificate details
        certificate_id: "ACFE-TEST-2024-001",
        course_name: "Certified Fraud Examiner Prep Course",
        
        // Timestamps
        issued_at: new Date().toISOString(),
        expires_at: expiresAt,
      };

      logStep("Payload created", payload);

      // Create a secret key from the shared secret
      const secret = new TextEncoder().encode(sharedSecret);
      
      // Sign the JWT
      const jwt = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(secret);

      logStep("Token generated successfully");

      // Build the redirect URL
      const spectrogramUrl = `https://spectrogramconsulting.com/acfe-callback?token=${jwt}&email=${encodeURIComponent(email)}`;

      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Test token generated",
          token: jwt,
          redirectUrl: spectrogramUrl,
          payload: payload
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } 
    
    if (action === "test-sync") {
      // Test the full sync flow by verifying the token can be created and decoded
      const testPayload = {
        email: "sync-test@acfe.africa",
        full_name: "Sync Test User",
        certificate_id: "ACFE-SYNC-TEST-001",
        course_name: "Test Course",
        skills: ["Testing", "Quality Assurance"],
        university: "Test University",
        country: "Kenya",
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const secret = new TextEncoder().encode(sharedSecret);
      
      // Generate token
      const jwt = await new jose.SignJWT(testPayload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(secret);

      logStep("Token generated for sync test");

      // Verify token can be decoded
      try {
        const { payload: decoded } = await jose.jwtVerify(jwt, secret);
        logStep("Token verified successfully", { decodedEmail: decoded.email });

        return new Response(
          JSON.stringify({ 
            success: true,
            message: "Sync test completed successfully",
            tokenValid: true,
            decodedPayload: decoded,
            redirectUrl: `https://spectrogramconsulting.com/acfe-callback?token=${jwt}&email=${encodeURIComponent(testPayload.email)}`
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      } catch (verifyError: any) {
        logStep("Token verification failed", { error: verifyError.message });
        return new Response(
          JSON.stringify({ 
            success: false,
            message: "Token verification failed",
            error: verifyError.message
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        error: "Invalid action. Use 'generate-token' or 'test-sync'" 
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    logStep("Error in test function", { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

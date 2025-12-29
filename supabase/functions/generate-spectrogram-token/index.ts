import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SPECTROGRAM-TOKEN] ${step}${detailsStr}`);
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

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the user's JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Invalid user token");
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get request body for certificate details
    const { certificateId, courseName, skills } = await req.json();

    // Get user profile with ALL fields
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, skills, university, country, avatar_url, bio, linkedin_url, twitter_url, instagram_url, github_url, website_url, companies_worked_for")
      .eq("id", user.id)
      .single();

    logStep("Profile fetched", { 
      fullName: profile?.full_name, 
      university: profile?.university,
      hasAvatar: !!profile?.avatar_url,
      skillsCount: profile?.skills?.length || 0
    });

    // Calculate expiration (7 days from now)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Create JWT payload with ALL profile data for Spectrogram
    const payload = {
      // Core identity
      email: user.email,
      full_name: profile?.full_name || user.user_metadata?.full_name || "",
      avatar_url: profile?.avatar_url || "",
      bio: profile?.bio || "",
      
      // Professional info
      university: profile?.university || "",
      country: profile?.country || "",
      skills: skills || profile?.skills || [courseName] || [],
      companies_worked_for: profile?.companies_worked_for || [],
      
      // Social links
      linkedin_url: profile?.linkedin_url || "",
      twitter_url: profile?.twitter_url || "",
      instagram_url: profile?.instagram_url || "",
      github_url: profile?.github_url || "",
      website_url: profile?.website_url || "",
      
      // Certificate details
      certificate_id: certificateId,
      course_name: courseName,
      
      // Timestamps
      issued_at: new Date().toISOString(),
      expires_at: expiresAt,
    };

    // Create a secret key from the shared secret
    const secret = new TextEncoder().encode(sharedSecret);
    
    // Sign the JWT
    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    logStep("Token generated successfully");

    // Track that user has initiated Spectrogram profile creation
    if (certificateId) {
      await supabase
        .from("course_certificates")
        .update({
          spectrogram_profile_created: true,
          spectrogram_profile_created_at: new Date().toISOString(),
        })
        .eq("certificate_number", certificateId);
      
      logStep("Certificate updated with Spectrogram tracking");
    }

    // Build the redirect URL
    const spectrogramUrl = `https://spectrogramconsulting.com/acfe-callback?token=${jwt}&email=${encodeURIComponent(user.email!)}`;

    return new Response(
      JSON.stringify({ 
        success: true, 
        redirectUrl: spectrogramUrl 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    logStep("Error generating token", { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

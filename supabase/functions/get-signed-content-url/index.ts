import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  contentId: string;
  urlType: 'video' | 'file' | 'audio';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to verify auth
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user from token
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { contentId, urlType }: RequestBody = await req.json();

    if (!contentId || !urlType) {
      return new Response(
        JSON.stringify({ error: "Missing contentId or urlType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the content item with course info - include audio_url
    const { data: content, error: contentError } = await supabaseAdmin
      .from("course_content")
      .select(`
        id,
        video_url,
        audio_url,
        file_url,
        section:course_sections!inner(
          course:courses!inner(
            id,
            mentor_id
          )
        )
      `)
      .eq("id", contentId)
      .single();

    if (contentError || !content) {
      return new Response(
        JSON.stringify({ error: "Content not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const courseId = (content.section as any).course.id;
    const mentorId = (content.section as any).course.mentor_id;

    // Check if user is the course mentor
    const isMentor = user.id === mentorId;

    // Check if user is an admin
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    
    const isAdmin = !!adminRole;

    // Check enrollment if not mentor or admin
    if (!isMentor && !isAdmin) {
      const { data: enrollment, error: enrollError } = await supabaseAdmin
        .from("enrollments")
        .select("id")
        .eq("course_id", courseId)
        .eq("student_id", user.id)
        .maybeSingle();

      if (enrollError || !enrollment) {
        return new Response(
          JSON.stringify({ error: "Not enrolled in this course" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get the appropriate URL based on type
    let sourceUrl: string | null = null;
    switch (urlType) {
      case 'video':
        sourceUrl = content.video_url;
        break;
      case 'audio':
        // Audio is stored in course-videos bucket, uses audio_url column
        sourceUrl = (content as any).audio_url || null;
        break;
      case 'file':
        sourceUrl = content.file_url;
        break;
    }
    
    if (!sourceUrl) {
      return new Response(
        JSON.stringify({ error: `No ${urlType} URL found for this content` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if it's an external URL (YouTube, Vimeo, etc.) - return as-is
    const isExternalUrl = sourceUrl.includes('youtube.com') || 
                          sourceUrl.includes('youtu.be') || 
                          sourceUrl.includes('vimeo.com') ||
                          sourceUrl.includes('loom.com') ||
                          !sourceUrl.includes(supabaseUrl);
    
    if (isExternalUrl) {
      return new Response(
        JSON.stringify({ signedUrl: sourceUrl, isExternal: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract bucket and file path from the Supabase storage URL
    // URL format: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file
    const urlParts = sourceUrl.split('/storage/v1/object/public/');
    if (urlParts.length !== 2) {
      // Try private URL format
      const privateUrlParts = sourceUrl.split('/storage/v1/object/');
      if (privateUrlParts.length === 2) {
        const pathPart = privateUrlParts[1];
        const bucketAndPath = pathPart.split('/');
        const bucket = bucketAndPath[0];
        const filePath = bucketAndPath.slice(1).join('/');

        // Generate signed URL (valid for 30 minutes)
        const { data: signedData, error: signError } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(filePath, 1800); // 30 minutes

        if (signError || !signedData) {
          console.error("Error creating signed URL:", signError);
          return new Response(
            JSON.stringify({ error: "Failed to generate signed URL" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ signedUrl: signedData.signedUrl, isExternal: false }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Invalid storage URL format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pathPart = urlParts[1];
    const bucketAndPath = pathPart.split('/');
    const bucket = bucketAndPath[0];
    const filePath = bucketAndPath.slice(1).join('/');

    // Generate signed URL (valid for 30 minutes)
    const { data: signedData, error: signError } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(filePath, 1800); // 30 minutes

    if (signError || !signedData) {
      console.error("Error creating signed URL:", signError);
      return new Response(
        JSON.stringify({ error: "Failed to generate signed URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ signedUrl: signedData.signedUrl, isExternal: false }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in get-signed-content-url:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

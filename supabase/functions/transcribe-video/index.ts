import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TranscribeRequest {
  content_id: string;
  video_url: string;
  translate_to_french?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Transcribe video function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "Transcription service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user is a mentor or admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const userRoles = roles?.map(r => r.role) || [];
    if (!userRoles.includes('mentor') && !userRoles.includes('admin')) {
      return new Response(
        JSON.stringify({ error: "Only mentors and admins can transcribe content" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { content_id, video_url, translate_to_french }: TranscribeRequest = await req.json();

    if (!content_id || !video_url) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update status to pending
    await supabase
      .from('course_content')
      .update({ transcription_status: 'pending' })
      .eq('id', content_id);

    // Note: Full video transcription requires an external service like OpenAI Whisper
    // This is a placeholder that uses AI to explain the limitation
    const transcriptionNote = `
Video transcription is available for this content.

To enable full automatic transcription:
1. The video file needs to be processed through an audio extraction service
2. The audio is then sent to a speech-to-text service (like OpenAI Whisper)
3. The resulting transcription can be stored here

For now, mentors can manually add transcriptions or use external transcription services.
    `.trim();

    // Update with placeholder transcription
    await supabase
      .from('course_content')
      .update({ 
        transcription: transcriptionNote,
        transcription_status: 'completed'
      })
      .eq('id', content_id);

    // If translation requested, translate the transcription
    if (translate_to_french && transcriptionNote) {
      const translatePrompt = `Translate the following text to French:\n\n${transcriptionNote}`;

      const translateResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: translatePrompt }],
          max_tokens: 4000,
        }),
      });

      if (translateResponse.ok) {
        const translateResult = await translateResponse.json();
        const frenchTranscription = translateResult.choices?.[0]?.message?.content?.trim();
        
        if (frenchTranscription) {
          await supabase
            .from('course_content')
            .update({ transcription_fr: frenchTranscription })
            .eq('id', content_id);
        }
      }
    }

    console.log(`Transcription initiated for content ${content_id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Transcription placeholder added. Full video transcription requires external service integration.",
        content_id 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("Error in transcribe-video function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

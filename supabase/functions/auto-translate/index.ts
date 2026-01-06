import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TranslateRequest {
  course_id?: string;
  content_id?: string;
  text: string;
  target_language: 'fr' | 'en';
  field: 'title' | 'description' | 'text_content';
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Auto-translate function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "Translation service not configured" }),
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
        JSON.stringify({ error: "Only mentors and admins can translate content" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { course_id, content_id, text, target_language, field }: TranslateRequest = await req.json();

    if (!text || !target_language || !field) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Use Lovable AI for translation
    const prompt = target_language === 'fr' 
      ? `Translate the following text to French. Keep the same formatting, tone, and style. Only output the translation, nothing else:\n\n${text}`
      : `Translate the following text to English. Keep the same formatting, tone, and style. Only output the translation, nothing else:\n\n${text}`;

    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Translation API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Translation failed" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const result = await response.json();
    const translatedText = result.choices?.[0]?.message?.content?.trim();

    if (!translatedText) {
      return new Response(
        JSON.stringify({ error: "Empty translation result" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Save translation to database if course_id or content_id provided
    if (course_id && field === 'title') {
      await supabase
        .from('courses')
        .update({ title_fr: translatedText })
        .eq('id', course_id);
    } else if (course_id && field === 'description') {
      await supabase
        .from('courses')
        .update({ description_fr: translatedText })
        .eq('id', course_id);
    } else if (content_id && field === 'title') {
      await supabase
        .from('course_content')
        .update({ title_fr: translatedText })
        .eq('id', content_id);
    } else if (content_id && field === 'text_content') {
      await supabase
        .from('course_content')
        .update({ text_content_fr: translatedText })
        .eq('id', content_id);
    }

    console.log(`Translation completed for ${field}, saved: ${!!course_id || !!content_id}`);

    return new Response(
      JSON.stringify({ 
        translated_text: translatedText,
        saved: !!course_id || !!content_id 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("Error in auto-translate function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

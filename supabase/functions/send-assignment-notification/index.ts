import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { escapeHtml } from "../_shared/html-escape.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Send Assignment Notification Edge Function
 * 
 * This is a PUBLIC wrapper that handles assignment notification emails
 * (approved, feedback/revision needed) by calling the internal send-email
 * function with service role authentication.
 * 
 * This bypasses client-side permission issues while keeping send-email secure.
 */

interface AssignmentNotificationRequest {
  type: 'assignment-approved' | 'assignment-feedback';
  studentEmail: string;
  studentName: string;
  studentId: string;
  courseName: string;
  mentorName: string;
  feedback?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[SEND-ASSIGNMENT-NOTIFICATION] Function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      type,
      studentEmail,
      studentName,
      studentId,
      courseName,
      mentorName,
      feedback
    }: AssignmentNotificationRequest = await req.json();

    // Validate required fields
    if (!type || !['assignment-approved', 'assignment-feedback'].includes(type)) {
      return new Response(
        JSON.stringify({ error: "Invalid notification type" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!studentEmail || !studentName || !studentId) {
      return new Response(
        JSON.stringify({ error: "Missing student information" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (type === 'assignment-feedback' && !feedback) {
      return new Response(
        JSON.stringify({ error: "Feedback is required for revision requests" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[SEND-ASSIGNMENT-NOTIFICATION] Sending ${type} to ${studentEmail}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get student's preferred language
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_language')
      .eq('id', studentId)
      .single();
    
    const language = profile?.preferred_language === 'fr' ? 'fr' : 'en';

    // Sanitize all user inputs
    const safeStudentName = escapeHtml(studentName);
    const safeCourseName = escapeHtml(courseName);
    const safeMentorName = escapeHtml(mentorName);
    const safeFeedback = feedback ? escapeHtml(feedback) : undefined;

    // Call centralized send-email function with service role key
    const emailResponse = await fetch(
      `${supabaseUrl}/functions/v1/send-email`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          to: studentEmail,
          data: {
            studentName: safeStudentName,
            courseName: safeCourseName,
            mentorName: safeMentorName,
            feedback: safeFeedback,
          },
          userId: studentId,
          language
        })
      }
    );

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('[SEND-ASSIGNMENT-NOTIFICATION] Centralized email failed:', errorText);
      return new Response(
        JSON.stringify({ error: errorText || 'Failed to send notification email' }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const result = await emailResponse.json();
    console.log('[SEND-ASSIGNMENT-NOTIFICATION] Email sent successfully:', result);

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("[SEND-ASSIGNMENT-NOTIFICATION] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-SESSION-NOTIFICATION] ${step}${detailsStr}`);
};

interface SessionNotificationRequest {
  sessionId: string;
  notificationType: 'booking_confirmed' | 'session_reminder' | 'session_cancelled';
}

// Generate calendar link URLs
const generateGoogleCalendarUrl = (
  title: string,
  description: string,
  date: string,
  startTime: string,
  endTime: string,
  timezone: string
): string => {
  const startDateTime = `${date.replace(/-/g, '')}T${startTime.replace(/:/g, '')}00`;
  const endDateTime = `${date.replace(/-/g, '')}T${endTime.replace(/:/g, '')}00`;
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startDateTime}/${endDateTime}`,
    details: description,
    ctz: timezone,
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const generateOutlookCalendarUrl = (
  title: string,
  description: string,
  date: string,
  startTime: string,
  endTime: string
): string => {
  const startDateTime = `${date}T${startTime}:00`;
  const endDateTime = `${date}T${endTime}:00`;
  
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: title,
    body: description,
    startdt: startDateTime,
    enddt: endDateTime,
  });
  
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
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

    const { sessionId, notificationType }: SessionNotificationRequest = await req.json();
    logStep("Request parsed", { sessionId, notificationType });

    // Fetch session with mentor and student details
    const { data: session, error: sessionError } = await supabaseClient
      .from('mentorship_sessions')
      .select(`
        *,
        mentor:profiles!mentorship_sessions_mentor_id_fkey(id, full_name, email),
        student:profiles!mentorship_sessions_student_id_fkey(id, full_name, email)
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error(`Session not found: ${sessionError?.message}`);
    }

    logStep("Session fetched", { 
      mentorEmail: session.mentor?.email, 
      studentEmail: session.student?.email 
    });

    const mentorName = session.mentor?.full_name || 'Mentor';
    const studentName = session.student?.full_name || 'Learner';
    const mentorEmail = session.mentor?.email;
    const studentEmail = session.student?.email;

    // Format date and time
    const sessionDate = new Date(session.scheduled_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const startTime = session.start_time.substring(0, 5);
    const endTime = session.end_time.substring(0, 5);

    // Generate calendar links
    const studentCalendarTitle = `1:1 Mentorship Session with ${mentorName}`;
    const mentorCalendarTitle = `1:1 Mentorship Session with ${studentName}`;
    const studentCalendarDesc = `Your mentorship session with ${mentorName}.\n\nPrepare your questions and topics to discuss.`;
    const mentorCalendarDesc = `Your mentorship session with ${studentName}.\n\nContact: ${studentEmail}`;
    
    const studentGoogleCalUrl = generateGoogleCalendarUrl(
      studentCalendarTitle,
      studentCalendarDesc,
      session.scheduled_date,
      startTime,
      endTime,
      session.timezone
    );
    const studentOutlookCalUrl = generateOutlookCalendarUrl(
      studentCalendarTitle,
      studentCalendarDesc,
      session.scheduled_date,
      startTime,
      endTime
    );
    const mentorGoogleCalUrl = generateGoogleCalendarUrl(
      mentorCalendarTitle,
      mentorCalendarDesc,
      session.scheduled_date,
      startTime,
      endTime,
      session.timezone
    );
    const mentorOutlookCalUrl = generateOutlookCalendarUrl(
      mentorCalendarTitle,
      mentorCalendarDesc,
      session.scheduled_date,
      startTime,
      endTime
    );

    const emailPromises = [];

    if (notificationType === 'booking_confirmed') {
      // Email to Student
      if (studentEmail) {
        emailPromises.push(
          resend.emails.send({
            from: "ACFE <noreply@acloudforeveryone.org>",
            to: [studentEmail],
            subject: `Your 1:1 Session with ${mentorName} is Confirmed!`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #1a1a1a; margin: 0;">Session Confirmed! 🎉</h1>
                </div>
                
                <p style="color: #333; font-size: 16px;">Hi ${studentName.split(' ')[0]},</p>
                
                <p style="color: #333; font-size: 16px;">Great news! Your 1:1 mentorship session with <strong>${mentorName}</strong> has been confirmed.</p>
                
                <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 24px 0;">
                  <h3 style="margin: 0 0 16px 0; color: #1a1a1a;">Session Details</h3>
                  <p style="margin: 8px 0; color: #555;"><strong>📅 Date:</strong> ${sessionDate}</p>
                  <p style="margin: 8px 0; color: #555;"><strong>🕐 Time:</strong> ${startTime} - ${endTime} (${session.timezone})</p>
                  <p style="margin: 8px 0; color: #555;"><strong>👤 Mentor:</strong> ${mentorName}</p>
                </div>
                
                <div style="text-align: center; margin: 24px 0;">
                  <p style="color: #333; font-size: 14px; margin-bottom: 12px;"><strong>Add to your calendar:</strong></p>
                  <a href="${studentGoogleCalUrl}" style="display: inline-block; background: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin: 4px; font-size: 14px;">Google Calendar</a>
                  <a href="${studentOutlookCalUrl}" style="display: inline-block; background: #0078d4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin: 4px; font-size: 14px;">Outlook Calendar</a>
                </div>
                
                <p style="color: #333; font-size: 16px;">Your mentor will reach out with meeting details shortly. In the meantime, you might want to prepare any questions or topics you'd like to discuss.</p>
                
                <p style="color: #333; font-size: 16px;">Best of luck with your session!</p>
                
                <p style="color: #666; font-size: 14px; margin-top: 40px;">
                  — The ACFE Team<br>
                  <a href="https://acloudforeveryone.org" style="color: #0066cc;">acloudforeveryone.org</a>
                </p>
              </body>
              </html>
            `,
          })
        );
        logStep("Student email queued");
      }

      // Email to Mentor
      if (mentorEmail) {
        emailPromises.push(
          resend.emails.send({
            from: "ACFE <noreply@acloudforeveryone.org>",
            to: [mentorEmail],
            subject: `New 1:1 Session Booked with ${studentName}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #1a1a1a; margin: 0;">New Session Booked! 📅</h1>
                </div>
                
                <p style="color: #333; font-size: 16px;">Hi ${mentorName.split(' ')[0]},</p>
                
                <p style="color: #333; font-size: 16px;">You have a new 1:1 mentorship session booked with <strong>${studentName}</strong>.</p>
                
                <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 24px 0;">
                  <h3 style="margin: 0 0 16px 0; color: #1a1a1a;">Session Details</h3>
                  <p style="margin: 8px 0; color: #555;"><strong>📅 Date:</strong> ${sessionDate}</p>
                  <p style="margin: 8px 0; color: #555;"><strong>🕐 Time:</strong> ${startTime} - ${endTime} (${session.timezone})</p>
                  <p style="margin: 8px 0; color: #555;"><strong>👤 Learner:</strong> ${studentName}</p>
                  <p style="margin: 8px 0; color: #555;"><strong>📧 Email:</strong> ${studentEmail}</p>
                </div>
                
                <div style="text-align: center; margin: 24px 0;">
                  <p style="color: #333; font-size: 14px; margin-bottom: 12px;"><strong>Add to your calendar:</strong></p>
                  <a href="${mentorGoogleCalUrl}" style="display: inline-block; background: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin: 4px; font-size: 14px;">Google Calendar</a>
                  <a href="${mentorOutlookCalUrl}" style="display: inline-block; background: #0078d4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin: 4px; font-size: 14px;">Outlook Calendar</a>
                </div>
                
                <p style="color: #333; font-size: 16px;"><strong>Next Steps:</strong></p>
                <ul style="color: #555; font-size: 15px;">
                  <li>Please reach out to ${studentName.split(' ')[0]} to share your meeting link</li>
                  <li>Consider sending a brief agenda or preparation tips</li>
                  <li>You can manage your sessions from your ACFE dashboard</li>
                </ul>
                
                <p style="color: #333; font-size: 16px;">Thank you for being an amazing mentor!</p>
                
                <p style="color: #666; font-size: 14px; margin-top: 40px;">
                  — The ACFE Team<br>
                  <a href="https://acloudforeveryone.org" style="color: #0066cc;">acloudforeveryone.org</a>
                </p>
              </body>
              </html>
            `,
          })
        );
        logStep("Mentor email queued");
      }
    }

    // Send all emails
    const results = await Promise.all(emailPromises);
    logStep("Emails sent", { count: results.length });

    return new Response(JSON.stringify({ 
      success: true,
      emailsSent: results.length 
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

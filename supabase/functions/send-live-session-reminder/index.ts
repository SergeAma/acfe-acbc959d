import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Checking for upcoming live sessions...");

    // Find live courses happening in the next 24-25 hours (to account for hourly cron)
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const { data: upcomingCourses, error: coursesError } = await supabase
      .from("courses")
      .select(`
        id,
        title,
        live_date,
        live_platform,
        live_url,
        mentor_id
      `)
      .eq("is_live", true)
      .eq("is_published", true)
      .gte("live_date", in24Hours.toISOString())
      .lt("live_date", in25Hours.toISOString());

    if (coursesError) {
      console.error("Error fetching courses:", coursesError);
      throw coursesError;
    }

    if (!upcomingCourses || upcomingCourses.length === 0) {
      console.log("No upcoming live sessions in the next 24-25 hours");
      return new Response(
        JSON.stringify({ message: "No upcoming sessions to remind about" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${upcomingCourses.length} upcoming live sessions`);

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const course of upcomingCourses) {
      // Get all enrolled students for this course
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select(`
          student_id,
          profiles!enrollments_student_id_fkey (
            email,
            full_name
          )
        `)
        .eq("course_id", course.id);

      if (enrollmentsError) {
        console.error(`Error fetching enrollments for course ${course.id}:`, enrollmentsError);
        continue;
      }

      if (!enrollments || enrollments.length === 0) {
        console.log(`No enrollments found for course: ${course.title}`);
        continue;
      }

      console.log(`Sending reminders to ${enrollments.length} students for: ${course.title}`);

      // Get mentor name
      const { data: mentor } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", course.mentor_id)
        .single();

      const liveDate = new Date(course.live_date);
      const formattedDate = liveDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const formattedTime = liveDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      });

      for (const enrollment of enrollments) {
        const profile = enrollment.profiles as any;
        if (!profile?.email) continue;

        const firstName = profile.full_name?.split(" ")[0] || "Learner";

        try {
          const { error: emailError } = await resend.emails.send({
            from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
            to: [profile.email],
            subject: `Reminder: "${course.title}" starts in 24 hours!`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td align="center" style="padding: 40px 0;">
                      <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <!-- Header -->
                        <tr>
                          <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px 40px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">A Cloud for Everyone</h1>
                          </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                          <td style="padding: 40px;">
                            <h2 style="color: #1a1a2e; margin: 0 0 20px 0; font-size: 22px;">Hi ${firstName}! 👋</h2>
                            
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                              This is a friendly reminder that your live session is starting soon!
                            </p>
                            
                            <div style="background-color: #f8f9fa; border-left: 4px solid #4f46e5; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                              <h3 style="color: #1a1a2e; margin: 0 0 15px 0; font-size: 18px;">${course.title}</h3>
                              <p style="color: #666666; margin: 0 0 10px 0; font-size: 14px;">
                                <strong>📅 Date:</strong> ${formattedDate}
                              </p>
                              <p style="color: #666666; margin: 0 0 10px 0; font-size: 14px;">
                                <strong>🕐 Time:</strong> ${formattedTime}
                              </p>
                              <p style="color: #666666; margin: 0 0 10px 0; font-size: 14px;">
                                <strong>📍 Platform:</strong> ${course.live_platform || "Online"}
                              </p>
                              ${mentor?.full_name ? `<p style="color: #666666; margin: 0; font-size: 14px;"><strong>👨‍🏫 Instructor:</strong> ${mentor.full_name}</p>` : ""}
                            </div>
                            
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                              Make sure to join on time to get the most out of your learning experience!
                            </p>
                            
                            ${course.live_url ? `
                            <table role="presentation" style="margin: 0 auto;">
                              <tr>
                                <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 6px;">
                                  <a href="${course.live_url}" style="display: inline-block; padding: 14px 30px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">Join Session</a>
                                </td>
                              </tr>
                            </table>
                            ` : ""}
                            
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                              See you there!<br>
                              <strong>The A Cloud for Everyone Team</strong>
                            </p>
                          </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                          <td style="background-color: #f8f9fa; padding: 25px 40px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="color: #999999; font-size: 12px; margin: 0;">
                              © ${new Date().getFullYear()} A Cloud for Everyone. All rights reserved.
                            </p>
                            <p style="color: #999999; font-size: 12px; margin: 10px 0 0 0;">
                              Questions? Contact us at <a href="mailto:contact@acloudforeveryone.org" style="color: #4f46e5;">contact@acloudforeveryone.org</a>
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
              </html>
            `,
          });

          if (emailError) {
            console.error(`Failed to send reminder to ${profile.email}:`, emailError);
            emailsFailed++;
          } else {
            console.log(`Reminder sent to ${profile.email} for course: ${course.title}`);
            emailsSent++;

            // Log the email
            await supabase.from("email_logs").insert({
              subject: `Reminder: "${course.title}" starts in 24 hours!`,
              status: "sent",
              sent_at: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error(`Error sending email to ${profile.email}:`, error);
          emailsFailed++;
        }
      }
    }

    console.log(`Reminder emails sent: ${emailsSent}, failed: ${emailsFailed}`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        emailsFailed,
        coursesProcessed: upcomingCourses.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-live-session-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

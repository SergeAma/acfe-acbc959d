import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildCanonicalEmail } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InstitutionRequestNotification {
  mentor_name: string;
  mentor_email: string;
  institution_name: string;
  request_type: 'exclusive_content' | 'cohort_mentoring';
  reason: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Institution request notification function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { mentor_name, mentor_email, institution_name, request_type, reason }: InstitutionRequestNotification = await req.json();

    // Fetch admin user IDs
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admins found to notify");
      return new Response(JSON.stringify({ success: true, message: "No admins to notify" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const adminUserIds = adminRoles.map(r => r.user_id);
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', adminUserIds);

    if (!adminProfiles || adminProfiles.length === 0) {
      console.log("No admin profiles found");
      return new Response(JSON.stringify({ success: true, message: "No admin emails found" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const requestTypeLabel = request_type === 'exclusive_content' 
      ? 'Exclusive Content Creation' 
      : 'Institution Cohort Mentoring';

    // Create in-app notifications for all admins
    const notificationMessage = `New institution request: ${mentor_name} wants to ${request_type === 'exclusive_content' ? 'create exclusive content for' : 'mentor a cohort at'} ${institution_name}`;
    
    const notificationsToInsert = adminProfiles.map(admin => ({
      user_id: admin.id,
      message: notificationMessage,
      link: '/admin/institutions',
      is_read: false,
    }));

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notificationsToInsert);

    if (notifError) {
      console.error("Error creating in-app notifications:", notifError);
    } else {
      console.log(`Created ${notificationsToInsert.length} in-app notifications for admins`);
    }

    // Send email notification
    const htmlContent = buildCanonicalEmail({
      headline: 'New Institution Partnership Request',
      body_primary: `
        <p>A mentor has submitted a new institution partnership request that requires your review.</p>
        <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600; width: 140px;">Mentor:</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${mentor_name} (${mentor_email})</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Institution:</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${institution_name}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Request Type:</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${requestTypeLabel}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: 600; vertical-align: top;">Reason:</td>
            <td style="padding: 10px;">${reason || 'No reason provided'}</td>
          </tr>
        </table>
        <p>Please review this request in the Admin Dashboard.</p>
      `,
      primary_cta: {
        label: 'Review Request',
        url: 'https://acloudforeveryone.org/admin/institutions',
      },
    }, 'en');

    const adminEmails = adminProfiles.map(p => p.email).filter(Boolean);
    
    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: adminEmails,
      subject: `New Institution Request: ${mentor_name} → ${institution_name}`,
      html: htmlContent,
    });

    console.log("Admin notification email sent:", emailResponse);

    await supabase.from('email_logs').insert({
      subject: `New Institution Request: ${mentor_name} → ${institution_name}`,
      status: 'sent',
      sent_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-institution-request-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const handler = async (req: Request): Promise<Response> => {
  console.log("Handle mentor action function called");
  
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const requestId = url.searchParams.get('request_id');

  console.log(`Action: ${action}, Request ID: ${requestId}`);

  if (!action || !requestId) {
    return new Response(generateHtmlResponse('error', 'Missing required parameters'), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  if (action !== 'approve' && action !== 'decline') {
    return new Response(generateHtmlResponse('error', 'Invalid action'), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the mentor request
    const { data: request, error: requestError } = await supabase
      .from('mentor_role_requests')
      .select('*, profiles:user_id(email, full_name)')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      console.error('Request not found:', requestError);
      return new Response(generateHtmlResponse('error', 'Mentor request not found'), {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Check if already processed
    if (request.status !== 'pending') {
      return new Response(generateHtmlResponse('info', `This request has already been ${request.status}`), {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const userProfile = request.profiles as { email: string; full_name: string } | null;
    const userEmail = userProfile?.email;
    const userName = userProfile?.full_name || 'User';
    const firstName = userName.split(' ')[0];
    const currentYear = new Date().getFullYear();

    if (action === 'approve') {
      // Update request status
      await supabase
        .from('mentor_role_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      // Add mentor role to user_roles
      await supabase
        .from('user_roles')
        .insert({
          user_id: request.user_id,
          role: 'mentor',
          approved_at: new Date().toISOString(),
        });

      // Update profile role for backward compatibility
      await supabase
        .from('profiles')
        .update({ role: 'mentor' })
        .eq('id', request.user_id);

      // Send approval email to user
      if (userEmail) {
        const approvalHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #4a5d4a; color: #ffffff;">
    <div style="padding: 40px 40px 20px 40px;">
      <h1 style="margin: 0; font-size: 28px; font-weight: normal;">🎉 Congratulations <strong>${firstName}</strong>!</h1>
    </div>
    
    <div style="padding: 20px 40px;">
      <p style="margin: 0 0 20px 0; line-height: 1.6;">
        Great news! Your application to become a mentor at A Cloud for Everyone has been <strong>approved</strong>!
      </p>
      
      <p style="margin: 0 0 20px 0; line-height: 1.6;">
        You now have access to create courses, mentor students, and make a real impact on the next generation of African tech talent.
      </p>
      
      <h2 style="margin: 30px 0 15px 0; font-size: 20px;">🚀 What's Next?</h2>
      <ul style="margin: 0 0 20px 0; padding-left: 0; list-style: none;">
        <li style="margin-bottom: 8px;">✔️ Log in to your dashboard to access mentor features</li>
        <li style="margin-bottom: 8px;">✔️ Create your first course to start teaching</li>
        <li style="margin-bottom: 8px;">✔️ Complete your mentor profile to attract students</li>
        <li style="margin-bottom: 8px;">✔️ Join our mentor community for support and updates</li>
      </ul>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.acloudforeveryone.org/dashboard" style="display: inline-block; background-color: #ffffff; color: #4a5d4a; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 6px;">Go to Dashboard</a>
      </div>
      
      <p style="margin: 30px 0 10px 0; font-weight: bold; font-size: 18px;">Welcome to the mentor team!</p>
      
      <p style="margin: 20px 0;">
        With gratitude,<br>
        <strong>The ACFE Team</strong><br>
        📧 contact@acloudforeveryone.org
      </p>
    </div>
    
    <div style="padding: 20px 40px; border-top: 1px solid rgba(255,255,255,0.2); text-align: center;">
      <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.7);">
        © ${currentYear} A Cloud for Everyone. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
        `;

        await resend.emails.send({
          from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
          to: [userEmail],
          subject: `🎉 Your Mentor Application Has Been Approved!`,
          html: approvalHtml,
        });

        await supabase.from('email_logs').insert({
          subject: `Mentor Approved: ${userName}`,
          status: 'sent',
          sent_at: new Date().toISOString()
        });
      }

      console.log(`Mentor request ${requestId} approved`);
      return new Response(generateHtmlResponse('success', `${userName}'s mentor application has been approved! They have been notified via email.`), {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });

    } else {
      // Decline action
      await supabase
        .from('mentor_role_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      // Send rejection email to user
      if (userEmail) {
        const rejectionHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background-color: #4a5d4a; padding: 40px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px; color: #ffffff;">A Cloud for Everyone</h1>
    </div>
    
    <div style="padding: 40px;">
      <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 22px;">Hello ${firstName},</h2>
      
      <p style="margin: 0 0 20px 0; line-height: 1.6; color: #333333;">
        Thank you for your interest in becoming a mentor at A Cloud for Everyone. After careful consideration, we're unable to approve your application at this time.
      </p>
      
      <p style="margin: 0 0 20px 0; line-height: 1.6; color: #333333;">
        This doesn't mean the door is closed! We encourage you to:
      </p>
      
      <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #333333; line-height: 1.8;">
        <li>Continue developing your skills on our platform</li>
        <li>Engage with our community and courses</li>
        <li>Reapply in the future when you have more experience</li>
      </ul>
      
      <p style="margin: 20px 0; line-height: 1.6; color: #333333;">
        If you have questions about this decision, please reach out to us at contact@acloudforeveryone.org.
      </p>
      
      <p style="margin: 30px 0 0 0; color: #333333;">
        Best regards,<br><br>
        <strong>The ACFE Team</strong>
      </p>
    </div>
    
    <div style="background-color: #f8f9fa; padding: 25px 40px; text-align: center; border-top: 1px solid #e5e5e5;">
      <p style="margin: 0; font-size: 12px; color: #999999;">
        © ${currentYear} A Cloud for Everyone. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
        `;

        await resend.emails.send({
          from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
          to: [userEmail],
          subject: `Update on Your Mentor Application`,
          html: rejectionHtml,
        });

        await supabase.from('email_logs').insert({
          subject: `Mentor Declined: ${userName}`,
          status: 'sent',
          sent_at: new Date().toISOString()
        });
      }

      console.log(`Mentor request ${requestId} declined`);
      return new Response(generateHtmlResponse('declined', `${userName}'s mentor application has been declined. They have been notified via email.`), {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }

  } catch (error: any) {
    console.error("Error in handle-mentor-action function:", error);
    return new Response(generateHtmlResponse('error', `An error occurred: ${error.message}`), {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
};

function generateHtmlResponse(type: 'success' | 'declined' | 'error' | 'info', message: string): string {
  const colors = {
    success: { bg: '#dcfce7', border: '#16a34a', text: '#166534', icon: '✓' },
    declined: { bg: '#fef3c7', border: '#d97706', text: '#92400e', icon: '✗' },
    error: { bg: '#fee2e2', border: '#dc2626', text: '#991b1b', icon: '!' },
    info: { bg: '#dbeafe', border: '#2563eb', text: '#1e40af', icon: 'ℹ' },
  };
  
  const color = colors[type];
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mentor Action - A Cloud for Everyone</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
  <div style="max-width: 500px; margin: 40px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
    <div style="background-color: #4a5d4a; padding: 30px; text-align: center;">
      <h1 style="margin: 0; font-size: 20px; color: #ffffff;">A Cloud for Everyone</h1>
    </div>
    
    <div style="padding: 40px; text-align: center;">
      <div style="width: 60px; height: 60px; background-color: ${color.bg}; border: 3px solid ${color.border}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 24px; color: ${color.text};">
        ${color.icon}
      </div>
      
      <h2 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 20px;">
        ${type === 'success' ? 'Application Approved!' : type === 'declined' ? 'Application Declined' : type === 'info' ? 'Information' : 'Error'}
      </h2>
      
      <p style="margin: 0 0 25px 0; line-height: 1.6; color: #666666;">
        ${message}
      </p>
      
      <a href="https://www.acloudforeveryone.org/admin/users" style="display: inline-block; background-color: #4a5d4a; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: 500; border-radius: 6px;">
        Go to Admin Dashboard
      </a>
    </div>
  </div>
</body>
</html>
  `;
}

serve(handler);
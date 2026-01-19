import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Convert ArrayBuffer to base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Generate HMAC signature for secure token verification
async function generateSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return arrayBufferToBase64(signature);
}

// Verify HMAC signature
async function verifySignature(data: string, signature: string, secret: string): Promise<boolean> {
  const expectedSignature = await generateSignature(data, secret);
  return signature === expectedSignature;
}

// Log admin action to audit trail
async function logAdminAudit(
  supabaseUrl: string,
  supabaseKey: string,
  adminId: string,
  action: string,
  targetUserId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const client = createClient(supabaseUrl, supabaseKey);
    await client.from('admin_audit_logs').insert({
      admin_id: adminId,
      action,
      target_user_id: targetUserId,
      metadata: metadata || {},
    });
  } catch (error) {
    console.error("Failed to log admin audit:", error);
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Handle mentor action function called");
  
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const requestId = url.searchParams.get('request_id');
  const token = url.searchParams.get('token');
  const adminId = url.searchParams.get('admin_id');

  console.log(`Action: ${action}, Request ID: ${requestId}, Admin ID: ${adminId}`);

  if (!action || !requestId) {
    return new Response(generateHtmlResponse('error', 'Missing required parameters'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (action !== 'approve' && action !== 'decline') {
    return new Response(generateHtmlResponse('error', 'Invalid action'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Security: Verify token signature
  const sharedSecret = Deno.env.get("ACFE_SHARED_SECRET");
  if (!sharedSecret) {
    console.error("ACFE_SHARED_SECRET not configured");
    return new Response(generateHtmlResponse('error', 'Server configuration error'), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (!token || !adminId) {
    console.error("Missing authentication token or admin_id");
    return new Response(generateHtmlResponse('error', 'Unauthorized: Missing authentication credentials'), {
      status: 401,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Verify the token signature (token = HMAC(action:request_id:admin_id, secret))
  const expectedData = `${action}:${requestId}:${adminId}`;
  const isValidToken = await verifySignature(expectedData, token, sharedSecret);
  
  if (!isValidToken) {
    console.error("Invalid token signature");
    return new Response(generateHtmlResponse('error', 'Unauthorized: Invalid or expired link'), {
      status: 401,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the admin_id is actually an admin
    const { data: adminRole, error: adminError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', adminId)
      .eq('role', 'admin')
      .single();

    if (adminError || !adminRole) {
      console.error("Admin verification failed:", adminError);
      return new Response(generateHtmlResponse('error', 'Unauthorized: Admin privileges required'), {
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Get the mentor request
    const { data: request, error: requestError } = await supabase
      .from('mentor_role_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      console.error('Request not found:', requestError);
      return new Response(generateHtmlResponse('error', 'Mentor request not found'), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Get user profile separately (no FK relationship)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', request.user_id)
      .single();

    // Check if already processed
    if (request.status !== 'pending') {
      return new Response(generateHtmlResponse('info', `This request has already been ${request.status}`), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const userEmail = userProfile?.email;
    const userName = userProfile?.full_name || 'User';
    const firstName = userName.split(' ')[0];
    const currentYear = new Date().getFullYear();

    if (action === 'approve') {
      // Update request status with reviewer info
      await supabase
        .from('mentor_role_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminId,
        })
        .eq('id', requestId);

      // Add mentor role to user_roles
      await supabase
        .from('user_roles')
        .insert({
          user_id: request.user_id,
          role: 'mentor',
          approved_at: new Date().toISOString(),
          approved_by: adminId,
        });

      // Update profile role for backward compatibility
      await supabase
        .from('profiles')
        .update({ role: 'mentor' })
        .eq('id', request.user_id);

      // Log to admin audit trail
      await logAdminAudit(supabaseUrl, supabaseServiceKey, adminId, 'mentor_approved', request.user_id, {
        request_id: requestId,
        user_name: userName,
        user_email: userEmail,
      });

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

      console.log(`Mentor request ${requestId} approved by admin ${adminId}`);
      return new Response(generateHtmlResponse('success', `${userName}'s mentor application has been approved! They have been notified via email.`), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });

    } else {
      // Decline action
      await supabase
        .from('mentor_role_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminId,
        })
        .eq('id', requestId);

      // Log to admin audit trail
      await logAdminAudit(supabaseUrl, supabaseServiceKey, adminId, 'mentor_rejected', request.user_id, {
        request_id: requestId,
        user_name: userName,
        user_email: userEmail,
      });

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

      console.log(`Mentor request ${requestId} declined by admin ${adminId}`);
      return new Response(generateHtmlResponse('declined', `${userName}'s mentor application has been declined. They have been notified via email.`), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

  } catch (error: unknown) {
    console.error("Error in handle-mentor-action function");
    return new Response(generateHtmlResponse('error', 'An error occurred processing this request'), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
};

function generateHtmlResponse(type: 'success' | 'declined' | 'error' | 'info', message: string): string {
  const config = {
    success: { bg: '#dcfce7', border: '#16a34a', text: '#166534', icon: '✓', title: 'Mentor Request Approved!' },
    declined: { bg: '#fef3c7', border: '#d97706', text: '#92400e', icon: '✗', title: 'Mentor Request Declined' },
    error: { bg: '#fee2e2', border: '#dc2626', text: '#991b1b', icon: '!', title: 'Error' },
    info: { bg: '#dbeafe', border: '#2563eb', text: '#1e40af', icon: 'ℹ', title: 'Information' },
  };
  
  const c = config[type];
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${c.title} - A Cloud for Everyone</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="min-height: 100vh; background-color: #f5f5f5;">
    <tr>
      <td align="center" valign="middle" style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #4a5d4a; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 20px; color: #ffffff; font-weight: 600;">A Cloud for Everyone</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px; text-align: center;">
              <!-- Icon -->
              <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom: 20px;">
                <tr>
                  <td style="width: 60px; height: 60px; background-color: ${c.bg}; border: 3px solid ${c.border}; border-radius: 50%; text-align: center; vertical-align: middle; font-size: 24px; color: ${c.text};">
                    ${c.icon}
                  </td>
                </tr>
              </table>
              
              <!-- Title -->
              <h2 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 22px; font-weight: 600;">
                ${c.title}
              </h2>
              
              <!-- Message -->
              <p style="margin: 0 0 25px 0; line-height: 1.6; color: #666666; font-size: 15px;">
                ${message}
              </p>
              
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td style="background-color: #4a5d4a; border-radius: 6px;">
                    <a href="https://www.acloudforeveryone.org/admin" style="display: inline-block; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: 500; font-size: 14px;">
                      Go to Admin Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Export the signature generator for use in notification emails
export { generateSignature };

serve(handler);

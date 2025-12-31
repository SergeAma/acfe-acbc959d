import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

interface WelcomeEmailRequest {
  email: string;
  first_name: string;
  role: 'student' | 'mentor';
  wants_mentor?: boolean;
  user_id?: string;
}

// Text-based ACFE header for reliable email rendering
const getAcfeHeader = () => `
  <div style="text-align: center; margin-bottom: 24px; background-color: #3f3f3f; padding: 24px; border-radius: 12px 12px 0 0;">
    <div style="font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: 4px; margin-bottom: 4px;">ACFE</div>
    <div style="font-size: 12px; color: #d4d4d4; letter-spacing: 2px; text-transform: uppercase;">A Cloud for Everyone</div>
  </div>
`;

const getAcfeFooter = (currentYear: number) => `
  <div style="text-align: center; margin-top: 32px; padding: 24px; background-color: #f8f9fa; border-top: 1px solid #e4e4e7;">
    <div style="font-size: 18px; font-weight: 700; color: #3f3f3f; letter-spacing: 2px; margin-bottom: 8px;">ACFE</div>
    <p style="color: #71717a; font-size: 12px; margin: 0 0 8px 0;">
      © ${currentYear} A Cloud for Everyone. All rights reserved.
    </p>
  </div>
`;

const handler = async (req: Request): Promise<Response> => {
  console.log("Welcome email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, first_name, role, wants_mentor, user_id }: WelcomeEmailRequest = await req.json();
    
    // Input validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email) || email.length > 254) {
      console.error("Invalid email provided:", email);
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (first_name && (typeof first_name !== 'string' || first_name.length > 100)) {
      console.error("Invalid first_name provided");
      return new Response(
        JSON.stringify({ error: "Invalid name - must be under 100 characters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const validRoles = ['student', 'mentor'];
    if (!role || typeof role !== 'string' || !validRoles.includes(role)) {
      console.error("Invalid role provided:", role);
      return new Response(
        JSON.stringify({ error: "Invalid role" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Validate user_id format if provided (UUID format)
    if (user_id && (typeof user_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_id))) {
      console.error("Invalid user_id provided:", user_id);
      return new Response(
        JSON.stringify({ error: "Invalid user ID format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    console.log(`Sending welcome email to ${email} (${role}, wants_mentor: ${wants_mentor})`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const currentYear = new Date().getFullYear();
    const firstName = first_name || 'there';

    let subject: string;
    let htmlContent: string;

    if (wants_mentor) {
      // Email for users who want to become mentors
      subject = `Welcome to A Cloud for Everyone, ${firstName}! 🎓`;
      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    ${getAcfeHeader()}
    
    <!-- Main content -->
    <div style="background-color: #ffffff; padding: 32px; border-radius: 0 0 12px 12px;">
      <h1 style="margin: 0 0 20px 0; font-size: 24px; color: #18181b;">Hello and welcome <strong>${firstName}</strong>,</h1>
      
      <p style="margin: 0 0 20px 0; line-height: 1.6; color: #3f3f46;">
        Welcome to A Cloud for Everyone (ACFE)! We're thrilled to have you join our community and excited to see that you're interested in becoming a mentor.
      </p>
      
      <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #4a5d4a;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #166534;">📋 About Your Mentor Application</h3>
        <p style="margin: 0; line-height: 1.6; font-size: 14px; color: #3f3f46;">
          All accounts start as learner accounts to ensure everyone understands our platform. We've received your interest in becoming a mentor, and our team will review your application shortly.
        </p>
      </div>
      
      <h2 style="margin: 30px 0 15px 0; font-size: 20px; color: #18181b;">🎯 What happens next?</h2>
      <ul style="margin: 0 0 20px 0; padding-left: 0; list-style: none; color: #3f3f46;">
        <li style="margin-bottom: 8px;">✔️ Our team will review your application within <strong>3-5 business days</strong></li>
        <li style="margin-bottom: 8px;">✔️ You'll receive an email notification with our decision</li>
        <li style="margin-bottom: 8px;">✔️ Once approved, you'll get access to create courses and mentor students</li>
        <li style="margin-bottom: 8px;">✔️ In the meantime, explore our platform as a learner!</li>
      </ul>
      
      <p style="margin: 20px 0; line-height: 1.6; color: #3f3f46;">
        🚀 Thank you for stepping forward to mentor the next generation of tech talent. Your knowledge and experience can help shape futures across Africa.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.acloudforeveryone.org/courses" style="display: inline-block; background-color: #4a5d4a; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 6px;">Explore Courses</a>
      </div>
      
      <p style="margin: 30px 0 10px 0; font-weight: bold; font-size: 18px; color: #18181b;">There's a cloud for everyone!</p>
      
      <p style="margin: 20px 0; color: #3f3f46;">
        With gratitude,<br>
        <strong>The ACFE Team</strong><br>
        📧 contact@acloudforeveryone.org
      </p>
    </div>
    
    ${getAcfeFooter(currentYear)}
  </div>
</body>
</html>
      `;

      // Get the mentor role request ID for this user
      let requestId = null;
      if (user_id) {
        const { data: mentorRequest } = await supabase
          .from('mentor_role_requests')
          .select('id')
          .eq('user_id', user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (mentorRequest) {
          requestId = mentorRequest.id;
        }
      }

      // Notify admins about the new mentor application
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminRoles && adminRoles.length > 0) {
        const adminUserIds = adminRoles.map((r: { user_id: string }) => r.user_id);
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', adminUserIds);

        if (adminProfiles && adminProfiles.length > 0) {
          const sharedSecret = Deno.env.get("ACFE_SHARED_SECRET");
          
          for (const admin of adminProfiles) {
            // Generate signed URLs for this specific admin
            let approveUrl = '';
            let declineUrl = '';
            
            if (requestId && sharedSecret) {
              const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
              const functionBaseUrl = `${supabaseUrl}/functions/v1/handle-mentor-action`;
              
              // Generate HMAC signatures for each action
              const approveData = `approve:${requestId}:${admin.id}`;
              const declineData = `decline:${requestId}:${admin.id}`;
              
              const approveToken = await generateSignature(approveData, sharedSecret);
              const declineToken = await generateSignature(declineData, sharedSecret);
              
              // URL-encode the tokens
              const encodedApproveToken = encodeURIComponent(approveToken);
              const encodedDeclineToken = encodeURIComponent(declineToken);
              
              approveUrl = `${functionBaseUrl}?action=approve&request_id=${requestId}&admin_id=${admin.id}&token=${encodedApproveToken}`;
              declineUrl = `${functionBaseUrl}?action=decline&request_id=${requestId}&admin_id=${admin.id}&token=${encodedDeclineToken}`;
            }
            
            const adminHtmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    ${getAcfeHeader()}
    
    <!-- Main content -->
    <div style="background-color: #ffffff; padding: 32px; border-radius: 0 0 12px 12px;">
      <h1 style="margin: 0 0 20px 0; font-size: 22px; color: #18181b;">New Mentor Application</h1>
      
      <p style="margin: 0 0 20px 0; line-height: 1.6; color: #333333;">
        Hello ${admin.full_name?.split(' ')[0] || 'Admin'},
      </p>
      
      <p style="margin: 0 0 20px 0; line-height: 1.6; color: #333333;">
        A new user has registered and expressed interest in becoming a mentor on A Cloud for Everyone.
      </p>
      
      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 16px;">Applicant Details:</h3>
        <table style="width: 100%;">
          <tr>
            <td style="padding: 5px 0; color: #666666;">Name:</td>
            <td style="padding: 5px 0; color: #1a1a1a; font-weight: 500;">${firstName}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #666666;">Email:</td>
            <td style="padding: 5px 0; color: #1a1a1a; font-weight: 500;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #666666;">Status:</td>
            <td style="padding: 5px 0;"><span style="background-color: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Pending Review</span></td>
          </tr>
        </table>
      </div>
      
      ${approveUrl && declineUrl ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${approveUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; margin-right: 10px;">✓ Approve</a>
        <a href="${declineUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px;">✗ Decline</a>
      </div>
      <p style="margin: 10px 0 20px 0; line-height: 1.4; color: #999999; font-size: 11px; text-align: center;">
        ⚠️ These action links are unique to you and cannot be shared.
      </p>
      ` : ''}
      
      <p style="margin: 20px 0; line-height: 1.6; color: #666666; font-size: 14px;">
        You can also review this application in the <a href="https://www.acloudforeveryone.org/admin/users" style="color: #4a5d4a;">Admin Dashboard</a>.
      </p>
    </div>
    
    ${getAcfeFooter(currentYear)}
  </div>
</body>
</html>
            `;

            try {
              await resend.emails.send({
                from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
                to: [admin.email],
                subject: `🎓 New Mentor Application: ${firstName}`,
                html: adminHtmlContent,
              });
              console.log(`Admin notification sent to ${admin.email}`);
            } catch (adminEmailError) {
              console.error(`Failed to send admin notification to ${admin.email}:`, adminEmailError);
            }
          }

          // Log the admin notification
          await supabase.from('email_logs').insert({
            subject: `Admin Notification: New Mentor Application - ${firstName}`,
            status: 'sent',
            sent_at: new Date().toISOString()
          });
        }
      }

    } else if (role === 'mentor') {
      // Approved mentor welcome email
      subject = `Welcome to A Cloud for Everyone, ${firstName}!`;
      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    ${getAcfeHeader()}
    
    <!-- Main content -->
    <div style="background-color: #ffffff; padding: 32px; border-radius: 0 0 12px 12px;">
      <h1 style="margin: 0 0 20px 0; font-size: 24px; color: #18181b;">Hello and welcome <strong>${firstName}</strong>,</h1>
      
      <p style="margin: 0 0 20px 0; line-height: 1.6; color: #3f3f46;">
        Thank you for stepping forward to mentor the next generation of tech talent. At A Cloud for Everyone (ACFE), we believe that real change happens when knowledge is shared—and your support plays a vital role in making this possible.
      </p>
      
      <p style="margin: 0 0 20px 0; line-height: 1.6; color: #3f3f46;">
        By joining our mentor community, you're helping learners across Africa not only build digital skills in cloud, cybersecurity, data, AI, and more—but also gain the confidence and career readiness they need to thrive.
      </p>
      
      <h2 style="margin: 30px 0 15px 0; font-size: 20px; color: #18181b;">🌍 What to Expect:</h2>
      <ul style="margin: 0 0 20px 0; padding-left: 0; list-style: none; color: #3f3f46;">
        <li style="margin-bottom: 8px;">✔️ Flexible, scalable mentorship opportunities</li>
        <li style="margin-bottom: 8px;">✔️ Support materials to guide your sessions</li>
        <li style="margin-bottom: 8px;">✔️ Regular updates on training cohorts & learner progress</li>
        <li style="margin-bottom: 8px;">✔️ A growing network of like-minded professionals</li>
        <li style="margin-bottom: 8px;">✔️ The chance to shape real futures through real guidance</li>
      </ul>
      
      <p style="margin: 20px 0; line-height: 1.6; color: #3f3f46;">
        🚀 The digital future is here—and your mentorship makes it more accessible and inclusive. We'll be in touch soon with next steps, available cohorts, and resources to help you get started.
      </p>
      
      <p style="margin: 20px 0; line-height: 1.6; color: #3f3f46;">
        In the meantime, connect with us at <a href="https://www.acloudforeveryone.org" style="color: #4a5d4a; text-decoration: underline;">www.acloudforeveryone.org</a> and keep an eye on your inbox!
      </p>
      
      <p style="margin: 30px 0 10px 0; font-weight: bold; font-size: 18px; color: #18181b;">There's a cloud for everyone!</p>
      
      <p style="margin: 20px 0; color: #3f3f46;">
        With gratitude,<br>
        <strong>The ACFE Team</strong><br>
        📧 contact@acloudforeveryone.org
      </p>
    </div>
    
    ${getAcfeFooter(currentYear)}
  </div>
</body>
</html>
      `;
    } else {
      // Standard student welcome email
      subject = `Welcome to A Cloud for Everyone, ${firstName}! 🎓`;
      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    ${getAcfeHeader()}
    
    <!-- Main content -->
    <div style="background-color: #ffffff; padding: 32px; border-radius: 0 0 12px 12px;">
      <h1 style="margin: 0 0 20px 0; font-size: 24px; color: #18181b;">Hello and welcome <strong>${firstName}</strong>,</h1>
      
      <p style="margin: 0 0 20px 0; line-height: 1.6; color: #3f3f46;">
        Welcome to A Cloud for Everyone (ACFE)! We're thrilled to have you join our community of learners building the digital skills needed to thrive in today's tech-driven world.
      </p>
      
      <p style="margin: 0 0 20px 0; line-height: 1.6; color: #3f3f46;">
        Your journey to becoming job-ready in cloud, data, AI, cybersecurity and more starts now. Our platform connects you with experienced mentors and practical courses designed specifically for African youth.
      </p>
      
      <h2 style="margin: 30px 0 15px 0; font-size: 20px; color: #18181b;">🎯 Getting Started:</h2>
      <ul style="margin: 0 0 20px 0; padding-left: 0; list-style: none; color: #3f3f46;">
        <li style="margin-bottom: 8px;">✔️ Browse our course catalog and enroll in courses that match your goals</li>
        <li style="margin-bottom: 8px;">✔️ Connect with mentors who can guide your learning journey</li>
        <li style="margin-bottom: 8px;">✔️ Complete your profile to help mentors understand your background</li>
        <li style="margin-bottom: 8px;">✔️ Have a startup idea? Submit it through our Innovator Incubator for mentorship and up to $500 funding!</li>
      </ul>
      
      <p style="margin: 20px 0; line-height: 1.6; color: #3f3f46;">
        🚀 The digital future is here—and you're now part of the movement making it more accessible across Africa.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.acloudforeveryone.org/courses" style="display: inline-block; background-color: #4a5d4a; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 6px;">Explore Courses</a>
      </div>
      
      <p style="margin: 30px 0 10px 0; font-weight: bold; font-size: 18px; color: #18181b;">There's a cloud for everyone!</p>
      
      <p style="margin: 20px 0; color: #3f3f46;">
        With gratitude,<br>
        <strong>The ACFE Team</strong><br>
        📧 contact@acloudforeveryone.org
      </p>
    </div>
    
    ${getAcfeFooter(currentYear)}
  </div>
</body>
</html>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject: subject,
      html: htmlContent,
    });

    console.log("Welcome email sent:", emailResponse);

    // Log the email
    await supabase.from('email_logs').insert({
      subject: subject,
      status: 'sent',
      sent_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
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

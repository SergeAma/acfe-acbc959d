import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MentorInvitationRequest {
  email: string;
  message?: string;
}

const verifyAdminRole = async (req: Request): Promise<{ isAdmin: boolean; userId: string | null; error?: string }> => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.log("No authorization header found");
    return { isAdmin: false, userId: null, error: 'Missing authorization header' };
  }

  // Extract the token from "Bearer <token>"
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    console.log("No token found in authorization header");
    return { isAdmin: false, userId: null, error: 'Missing token' };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  // Use service role client to verify the token
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get user from the JWT token directly
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError) {
    console.log("Auth error:", authError.message);
    return { isAdmin: false, userId: null, error: 'Invalid or expired token' };
  }
  
  if (!user) {
    console.log("No user found for token");
    return { isAdmin: false, userId: null, error: 'Invalid or expired token' };
  }

  console.log("User authenticated:", user.id);
  
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (roleError) {
    console.log("Role check error:", roleError.message);
    return { isAdmin: false, userId: user.id, error: 'Failed to check admin role' };
  }

  if (!roleData) {
    console.log("User is not an admin");
    return { isAdmin: false, userId: user.id, error: 'User is not an admin' };
  }

  console.log("Admin role verified for user:", user.id);
  return { isAdmin: true, userId: user.id };
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Send mentor invitation function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { isAdmin, userId, error: authError } = await verifyAdminRole(req);
  if (!isAdmin) {
    console.error("Authorization failed:", authError);
    return new Response(
      JSON.stringify({ error: authError || 'Unauthorized' }),
      { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, message }: MentorInvitationRequest = await req.json();

    console.log(`Admin ${userId} sending mentor invitation to ${email}`);

    // Check if invitation already exists
    const { data: existingInvitation } = await supabase
      .from('mentor_invitations')
      .select('id, status')
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvitation) {
      return new Response(
        JSON.stringify({ error: 'A pending invitation already exists for this email' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create invitation
    const { data: invitation, error: insertError } = await supabase
      .from('mentor_invitations')
      .insert({
        email,
        invited_by: userId
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create invitation:", insertError);
      throw new Error("Failed to create invitation");
    }

    const inviteUrl = `${Deno.env.get("SITE_URL") || "https://acloudforeveryone.org"}/accept-mentor-invite?token=${invitation.token}`;
    const currentYear = new Date().getFullYear();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- ACFE Text Header -->
    <div style="text-align: center; margin-bottom: 0; background-color: #3f3f3f; padding: 24px; border-radius: 12px 12px 0 0;">
      <div style="font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: 4px; margin-bottom: 4px;">ACFE</div>
      <div style="font-size: 12px; color: #d4d4d4; letter-spacing: 2px; text-transform: uppercase;">A Cloud for Everyone</div>
    </div>
    
    <div style="background-color: #ffffff; padding: 32px; border-radius: 0 0 12px 12px;">
      <h1 style="margin: 0 0 20px 0; font-size: 24px; color: #18181b; text-align: center;">You're Invited to Become a Mentor! 🎉</h1>
      
      <p style="color: #3f3f46; line-height: 1.6;">Hello,</p>
      
      <p style="color: #3f3f46; line-height: 1.6;">You have been invited to join <strong>A Cloud for Everyone</strong> as a mentor and share your expertise with learners across Africa.</p>
      
      ${message ? `<div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #4a5d4a; margin: 20px 0; border-radius: 0 8px 8px 0;"><em style="color: #3f3f46;">"${message}"</em></div>` : ''}
      
      <p style="color: #3f3f46; line-height: 1.6;">As a mentor, you'll be able to:</p>
      <ul style="color: #3f3f46; line-height: 1.8; padding-left: 20px;">
        <li>Create and publish courses</li>
        <li>Share your knowledge with students</li>
        <li>Help shape the next generation of African tech talent</li>
      </ul>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteUrl}" style="background: #4a5d4a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Accept Invitation</a>
      </div>
      
      <p style="font-size: 14px; color: #666; margin-top: 24px;">This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.</p>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 24px;">
      <div style="font-size: 18px; font-weight: 700; color: #3f3f3f; letter-spacing: 2px; margin-bottom: 8px;">ACFE</div>
      <p style="font-size: 12px; color: #71717a; margin: 0 0 8px 0;">
        © ${currentYear} A Cloud for Everyone. All rights reserved.
      </p>
      <a href="mailto:contact@acloudforeveryone.org" style="color: #4a5d4a; font-size: 12px;">contact@acloudforeveryone.org</a>
    </div>
  </div>
</body>
</html>
    `;

    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject: "You're Invited to Become a Mentor at A Cloud for Everyone",
      html: htmlContent,
    });

    console.log("Mentor invitation email sent:", emailResponse);

    await supabase.from('email_logs').insert({
      subject: "Mentor Invitation",
      status: 'sent',
      sent_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ success: true, invitation }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-mentor-invitation function:", error);
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

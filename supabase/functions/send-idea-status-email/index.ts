import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IdeaStatusEmailRequest {
  email: string;
  first_name: string;
  idea_title: string;
  new_status: string;
}

const getStatusEmailContent = (firstName: string, ideaTitle: string, status: string) => {
  const currentYear = new Date().getFullYear();
  
  const statusMessages: Record<string, { subject: string; heading: string; message: string; color: string }> = {
    under_review: {
      subject: `Your idea "${ideaTitle}" is now under review`,
      heading: "Your Idea is Under Review! 🔍",
      message: `Great news! Our team has started reviewing your idea "<strong>${ideaTitle}</strong>". We're carefully evaluating your pitch and will get back to you with our feedback soon. This process typically takes 5-7 business days.`,
      color: "#3b82f6"
    },
    approved: {
      subject: `Congratulations! Your idea "${ideaTitle}" has been approved`,
      heading: "Congratulations! Your Idea is Approved! 🎉",
      message: `We're thrilled to inform you that your idea "<strong>${ideaTitle}</strong>" has been approved! Our team was impressed by your pitch and we're excited to support you on your entrepreneurial journey. A member of our team will reach out to you shortly to discuss next steps and how we can help bring your vision to life.`,
      color: "#22c55e"
    },
    rejected: {
      subject: `Update on your idea submission "${ideaTitle}"`,
      heading: "Update on Your Submission",
      message: `Thank you for submitting your idea "<strong>${ideaTitle}</strong>" to A Cloud for Everyone. After careful consideration, we've decided not to move forward with your submission at this time. This doesn't mean your idea lacks merit – it may simply not align with our current focus areas. We encourage you to continue refining your concept and consider resubmitting in the future. Don't give up on your entrepreneurial dreams!`,
      color: "#f59e0b"
    },
    pending: {
      subject: `Your idea "${ideaTitle}" status has been updated`,
      heading: "Status Update",
      message: `The status of your idea "<strong>${ideaTitle}</strong>" has been updated to pending. Our team will review it soon.`,
      color: "#6b7280"
    }
  };

  const content = statusMessages[status] || statusMessages.pending;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #18181b;">A Cloud for Everyone</h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #71717a;">Innovators Incubator</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="width: 60px; height: 4px; background-color: ${content.color}; margin-bottom: 24px; border-radius: 2px;"></div>
              
              <h2 style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #18181b;">${content.heading}</h2>
              
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
                Hi ${firstName},
              </p>
              
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
                ${content.message}
              </p>
              
              ${status === 'approved' ? `
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 14px; color: #166534;">
                  <strong>What's Next?</strong><br>
                  Our team will contact you within 48 hours to schedule an introductory call and discuss the support we can provide.
                </p>
              </div>
              ` : ''}
              
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
                If you have any questions, feel free to reach out to us at <a href="mailto:hello@acloudforeveryone.org" style="color: ${content.color}; text-decoration: none;">hello@acloudforeveryone.org</a>.
              </p>
              
              <p style="margin: 24px 0 0; font-size: 16px; line-height: 1.6; color: #3f3f46;">
                Best regards,<br>
                <strong>The A Cloud for Everyone Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; font-size: 12px; color: #71717a; text-align: center;">
                © ${currentYear} A Cloud for Everyone. All rights reserved.<br>
                <a href="https://acloudforeveryone.org" style="color: #71717a;">acloudforeveryone.org</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { html, subject: content.subject };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, first_name, idea_title, new_status }: IdeaStatusEmailRequest = await req.json();

    console.log("Sending idea status email to:", email, "Status:", new_status);

    const { html, subject } = getStatusEmailContent(first_name, idea_title, new_status);

    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject: subject,
      html: html,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log the email in the database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    await supabaseClient.from("email_logs").insert({
      subject: subject,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-idea-status-email function:", error);
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

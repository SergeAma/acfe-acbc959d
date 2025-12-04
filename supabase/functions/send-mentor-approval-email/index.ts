import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MentorApprovalRequest {
  user_id: string;
  email: string;
  first_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Mentor approval email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, email, first_name }: MentorApprovalRequest = await req.json();

    console.log(`Sending mentor approval email to ${email}`);

    // Fetch the mentor approval template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('name', 'Mentor Approval')
      .single();

    if (templateError || !template) {
      console.error("Template not found:", templateError);
      throw new Error("Mentor Approval template not found");
    }

    // Replace variables in template
    let htmlContent = template.html_content;
    let subject = template.subject;
    
    const currentYear = new Date().getFullYear();
    htmlContent = htmlContent.replace(/\{\{first_name\}\}/gi, first_name || 'Mentor');
    htmlContent = htmlContent.replace(/\{\{year\}\}/gi, currentYear.toString());
    htmlContent = htmlContent.replace(/2024/g, currentYear.toString());
    subject = subject.replace(/\{\{first_name\}\}/gi, first_name || 'Mentor');

    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <onboarding@resend.dev>",
      to: [email],
      subject: subject,
      html: htmlContent,
    });

    console.log("Mentor approval email sent:", emailResponse);

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
    console.error("Error in send-mentor-approval-email function:", error);
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

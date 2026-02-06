import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { verifyAdmin, corsHeaders } from "../_shared/auth.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface TestEmailRequest {
  to_email: string;
  subject: string;
  html_content: string;
  test_data?: Record<string, string>;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Test email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin role using shared middleware
    const { user, supabase } = await verifyAdmin(req);
    console.log(`Admin authorized. User ID: ${user.id}`);

    const { to_email, subject, html_content, test_data }: TestEmailRequest = await req.json();

    console.log(`Sending test email to ${to_email}`);

    let personalizedContent = html_content;
    let personalizedSubject = subject;
    const currentYear = new Date().getFullYear();
    
    const defaultTestData: Record<string, string> = {
      first_name: 'Test User',
      last_name: 'Smith',
      email: to_email,
      name: 'Test User Smith',
      year: currentYear.toString(),
      unsubscribe_url: '#',
      ...test_data
    };

    Object.entries(defaultTestData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
      personalizedContent = personalizedContent.replace(regex, value);
      personalizedSubject = personalizedSubject.replace(regex, value);
    });
    
    personalizedContent = personalizedContent.replace(/2024/g, currentYear.toString());

    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [to_email],
      subject: `[TEST] ${personalizedSubject}`,
      html: personalizedContent,
    });

    console.log("Test email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-test-email function:", error);
    
    // Return 401 for auth errors, 500 for other errors
    const status = error.message?.includes('authorization') || 
                   error.message?.includes('token') || 
                   error.message?.includes('Admin') ? 401 : 500;
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

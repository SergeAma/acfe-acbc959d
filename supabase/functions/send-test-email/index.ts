import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  to_email: string;
  subject: string;
  html_content: string;
  test_data?: Record<string, string>;
}

const verifyAdminRole = async (req: Request): Promise<{ isAdmin: boolean; userId: string | null; error?: string }> => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { isAdmin: false, userId: null, error: 'Missing authorization header' };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { isAdmin: false, userId: null, error: 'Invalid or expired token' };
  }

  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data: roleData, error: roleError } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (roleError || !roleData) {
    return { isAdmin: false, userId: user.id, error: 'User is not an admin' };
  }

  return { isAdmin: true, userId: user.id };
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Test email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify admin role
  const { isAdmin, error: authError } = await verifyAdminRole(req);
  if (!isAdmin) {
    console.error("Authorization failed:", authError);
    return new Response(
      JSON.stringify({ error: authError || 'Unauthorized' }),
      { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const { to_email, subject, html_content, test_data }: TestEmailRequest = await req.json();

    console.log(`Admin authorized. Sending test email to ${to_email}`);

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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface IdeaConfirmationRequest {
  name: string;
  email: string;
  ideaTitle: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, ideaTitle }: IdeaConfirmationRequest = await req.json();
    
    console.log(`Sending confirmation email to ${email} for idea: ${ideaTitle}`);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "A Cloud for Everyone <onboarding@resend.dev>",
        to: [email],
        subject: "We've Received Your Idea Submission!",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .logo { font-size: 24px; font-weight: bold; color: #1a1a1a; }
              .content { background: #f9f9f9; border-radius: 12px; padding: 30px; margin-bottom: 30px; }
              .highlight { background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .footer { text-align: center; font-size: 14px; color: #666; }
              h1 { color: #1a1a1a; margin-bottom: 20px; }
              .idea-title { font-weight: bold; color: #2e7d32; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">A Cloud for Everyone</div>
              </div>
              
              <div class="content">
                <h1>Thank You, ${name}!</h1>
                
                <p>We're excited to let you know that we've received your idea submission:</p>
                
                <div class="highlight">
                  <p><strong>Your Idea:</strong> <span class="idea-title">${ideaTitle}</span></p>
                </div>
                
                <p>Our team is reviewing your submission and we'll be in touch within <strong>7 days</strong> with next steps.</p>
                
                <p>As a reminder, new founders are eligible for up to <strong>$500 in seed funding</strong> from our partner, Spectrogram Consulting.</p>
                
                <p>In the meantime, feel free to explore our courses and resources to help develop your skills further.</p>
                
                <p>Best regards,<br>
                The A Cloud for Everyone Team</p>
              </div>
              
              <div class="footer">
                <p>Building Africa's next generation of tech leaders</p>
                <p>© ${new Date().getFullYear()} A Cloud for Everyone. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const data = await res.json();
    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending confirmation email:", error);
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

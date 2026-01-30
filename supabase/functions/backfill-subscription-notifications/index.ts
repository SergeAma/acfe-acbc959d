import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BACKFILL-NOTIFICATIONS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Verify admin authorization
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Check if user is admin
    const { data: hasAdminRole } = await supabaseClient
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (!hasAdminRole) {
      throw new Error("Admin access required");
    }

    logStep("Admin verified", { adminId: user.id });

    // Parse request body for options
    const { 
      since = '2026-01-27', 
      dryRun = true,
      sendEmails = false 
    } = await req.json().catch(() => ({}));

    logStep("Options", { since, dryRun, sendEmails });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get recent checkout sessions since the specified date
    const sinceTimestamp = Math.floor(new Date(since).getTime() / 1000);
    
    logStep("Fetching checkout sessions since", { since, sinceTimestamp });

    // Fetch recent successful checkout sessions
    const checkoutSessions = await stripe.checkout.sessions.list({
      limit: 100,
      created: { gte: sinceTimestamp },
    });

    logStep("Found checkout sessions", { count: checkoutSessions.data.length });

    const results: Array<{
      sessionId: string;
      customerEmail: string | null;
      customerName: string | null;
      amount: number;
      mode: string;
      status: string;
      created: string;
      emailSent?: boolean;
      error?: string;
    }> = [];

    // Process each session
    for (const session of checkoutSessions.data) {
      if (session.payment_status !== 'paid') {
        continue; // Skip unpaid sessions
      }

      const customerEmail = session.customer_details?.email || session.customer_email;
      const customerName = session.customer_details?.name || 'Learner';
      const amount = (session.amount_total || 0) / 100;
      const created = new Date(session.created * 1000).toISOString();

      const record = {
        sessionId: session.id,
        customerEmail,
        customerName,
        amount,
        mode: session.mode || 'unknown',
        status: session.payment_status,
        created,
        emailSent: false,
      };

      // If sendEmails is true and not dryRun, actually send the email
      if (sendEmails && !dryRun && customerEmail) {
        try {
          // Get course details if available
          const courseId = session.metadata?.course_id;
          let courseTitle = session.metadata?.course_title || 'your subscription';

          if (courseId) {
            const { data: course } = await supabaseClient
              .from('courses')
              .select('title')
              .eq('id', courseId)
              .single();
            if (course?.title) {
              courseTitle = course.title;
            }
          }

          // Send the confirmation email
          await supabaseClient.functions.invoke('send-purchase-confirmation', {
            body: {
              email: customerEmail,
              firstName: customerName.split(' ')[0],
              courseTitle: courseTitle,
              amount: amount,
              isSubscription: session.mode === 'subscription',
              isTrial: false,
            },
          });

          record.emailSent = true;
          logStep("Backfill email sent", { email: customerEmail, sessionId: session.id });

          // Add delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 600));
        } catch (emailError) {
          logStep("Error sending backfill email", { 
            email: customerEmail, 
            error: String(emailError) 
          });
          (record as any).error = String(emailError);
        }
      }

      results.push(record);
    }

    // Also check for active subscriptions to ensure notification coverage
    const subscriptions = await stripe.subscriptions.list({
      limit: 100,
      created: { gte: sinceTimestamp },
      status: 'active',
    });

    logStep("Found active subscriptions", { count: subscriptions.data.length });

    const subscriptionResults: Array<{
      subscriptionId: string;
      customerId: string;
      customerEmail: string | null;
      status: string;
      created: string;
      emailSent?: boolean;
      error?: string;
    }> = [];

    for (const subscription of subscriptions.data) {
      try {
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        
        if (customer.deleted) continue;

        const record = {
          subscriptionId: subscription.id,
          customerId: customer.id,
          customerEmail: customer.email,
          status: subscription.status,
          created: new Date(subscription.created * 1000).toISOString(),
          emailSent: false,
        };

        if (sendEmails && !dryRun && customer.email) {
          try {
            await supabaseClient.functions.invoke('send-subscription-created', {
              body: {
                email: customer.email,
                name: customer.name || 'Learner',
                subscription_start: new Date(subscription.current_period_start * 1000).toLocaleDateString(),
              },
            });
            record.emailSent = true;
            logStep("Backfill subscription email sent", { email: customer.email });

            // Rate limit delay
            await new Promise(resolve => setTimeout(resolve, 600));
          } catch (emailError) {
            (record as any).error = String(emailError);
          }
        }

        subscriptionResults.push(record);
      } catch (error) {
        logStep("Error processing subscription", { 
          subscriptionId: subscription.id, 
          error: String(error) 
        });
      }
    }

    const summary = {
      dryRun,
      sendEmails,
      since,
      checkoutSessions: {
        total: results.length,
        emailsSent: results.filter(r => r.emailSent).length,
        data: results,
      },
      subscriptions: {
        total: subscriptionResults.length,
        emailsSent: subscriptionResults.filter(r => r.emailSent).length,
        data: subscriptionResults,
      },
    };

    logStep("Backfill complete", { 
      checkoutTotal: summary.checkoutSessions.total,
      subscriptionsTotal: summary.subscriptions.total,
      dryRun 
    });

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

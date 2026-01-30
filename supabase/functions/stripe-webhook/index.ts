import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Async event processor - runs AFTER 200 response is sent
async function processEventAsync(event: Stripe.Event) {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Processing event asynchronously", { type: event.type, id: event.id });

    switch (event.type) {
      // ==========================================
      // CHECKOUT COMPLETED - Initial purchase/subscription
      // ==========================================
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { 
          sessionId: session.id, 
          mode: session.mode,
          paymentStatus: session.payment_status,
          customerId: session.customer 
        });

        // Get customer email
        const customerEmail = session.customer_details?.email || session.customer_email;
        const customerName = session.customer_details?.name || 'Learner';

        if (!customerEmail) {
          logStep("No customer email found in session");
          break;
        }

        // Determine if this is a subscription or one-time payment
        const isSubscription = session.mode === 'subscription';
        const amountTotal = (session.amount_total || 0) / 100;

        // Get course details if available from metadata
        const courseId = session.metadata?.course_id;
        let courseTitle = session.metadata?.course_title || 'your purchase';

        if (courseId && !session.metadata?.course_title) {
          // Try to fetch course title
          const { data: course } = await supabase
            .from('courses')
            .select('title')
            .eq('id', courseId)
            .single();
          if (course?.title) {
            courseTitle = course.title;
          }
        }

        // Send purchase confirmation email
        try {
          await supabase.functions.invoke('send-purchase-confirmation', {
            body: {
              email: customerEmail,
              firstName: customerName.split(' ')[0],
              courseTitle: courseTitle,
              amount: amountTotal,
              isSubscription: isSubscription,
              isTrial: false,
            },
          });
          logStep("Purchase confirmation email sent", { email: customerEmail });
        } catch (emailError) {
          logStep("Error sending purchase confirmation", { error: String(emailError) });
        }

        // Also send subscription created if it's a subscription
        if (isSubscription) {
          try {
            await supabase.functions.invoke('send-subscription-created', {
              body: {
                email: customerEmail,
                name: customerName,
                subscription_start: new Date().toLocaleDateString(),
              },
            });
            logStep("Subscription created email sent", { email: customerEmail });
          } catch (emailError) {
            logStep("Error sending subscription created email", { error: String(emailError) });
          }
        }
        break;
      }

      // ==========================================
      // SUBSCRIPTION CREATED - New subscription activated
      // ==========================================
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        logStep("Subscription created", { subscriptionId: subscription.id, customerId });

        try {
          const customer = await stripe.customers.retrieve(customerId);
          if (!customer.deleted && customer.email) {
            await supabase.functions.invoke('send-subscription-created', {
              body: {
                email: customer.email,
                name: customer.name || 'Learner',
                subscription_start: new Date(subscription.current_period_start * 1000).toLocaleDateString(),
              },
            });
            logStep("Subscription created email sent");
          }
        } catch (error) {
          logStep("Error in subscription.created handler", { error: String(error) });
        }
        break;
      }

      // ==========================================
      // SUBSCRIPTION DELETED/CANCELED
      // ==========================================
      case "customer.subscription.deleted":
      case "customer.subscription.canceled": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        logStep("Subscription canceled/deleted", { subscriptionId: subscription.id, customerId });

        try {
          const customer = await stripe.customers.retrieve(customerId);
          if (customer.deleted) {
            logStep("Customer was deleted");
            break;
          }

          const customerEmail = customer.email;
          if (!customerEmail) {
            logStep("No customer email");
            break;
          }

          // Find user by email
          const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
          if (userError) {
            logStep("Error listing users", { error: userError.message });
            break;
          }

          const user = userData.users.find(u => u.email === customerEmail);
          if (!user) {
            logStep("User not found for email", { email: customerEmail });
            break;
          }

          // Update course purchases status
          await supabase
            .from('course_purchases')
            .update({ status: 'cancelled' })
            .eq('student_id', user.id)
            .eq('stripe_subscription_id', subscription.id);

          // Send cancellation email
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

          await supabase.functions.invoke('send-subscription-cancelled', {
            body: {
              email: customerEmail,
              name: profile?.full_name || 'Learner',
              subscription_end: new Date(subscription.current_period_end * 1000).toLocaleDateString(),
            },
          });
          logStep("Cancellation email sent");
        } catch (error) {
          logStep("Error in subscription.deleted handler", { error: String(error) });
        }
        break;
      }

      // ==========================================
      // SUBSCRIPTION PAUSED
      // ==========================================
      case "customer.subscription.paused": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        logStep("Subscription paused", { subscriptionId: subscription.id });

        try {
          const customer = await stripe.customers.retrieve(customerId);
          if (!customer.deleted && customer.email) {
            await supabase.functions.invoke('send-subscription-paused', {
              body: {
                email: customer.email,
                name: customer.name || 'Learner',
              },
            });
            logStep("Subscription paused email sent");
          }
        } catch (error) {
          logStep("Error in subscription.paused handler", { error: String(error) });
        }
        break;
      }

      // ==========================================
      // SUBSCRIPTION RESUMED
      // ==========================================
      case "customer.subscription.resumed": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        logStep("Subscription resumed", { subscriptionId: subscription.id });

        try {
          const customer = await stripe.customers.retrieve(customerId);
          if (!customer.deleted && customer.email) {
            await supabase.functions.invoke('send-subscription-resumed', {
              body: {
                email: customer.email,
                name: customer.name || 'Learner',
                next_billing: new Date(subscription.current_period_end * 1000).toLocaleDateString(),
              },
            });
            logStep("Subscription resumed email sent");
          }
        } catch (error) {
          logStep("Error in subscription.resumed handler", { error: String(error) });
        }
        break;
      }

      // ==========================================
      // SUBSCRIPTION UPDATED
      // ==========================================
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { 
          subscriptionId: subscription.id, 
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end 
        });

        // Send reminder if subscription is set to cancel at period end
        if (subscription.cancel_at_period_end) {
          try {
            const customerId = subscription.customer as string;
            const customer = await stripe.customers.retrieve(customerId);
            
            if (!customer.deleted && customer.email) {
              await supabase.functions.invoke('send-subscription-ending-reminder', {
                body: {
                  email: customer.email,
                  name: customer.name || 'Learner',
                  subscription_end: new Date(subscription.current_period_end * 1000).toLocaleDateString(),
                },
              });
              logStep("Subscription ending reminder sent");
            }
          } catch (error) {
            logStep("Error sending ending reminder", { error: String(error) });
          }
        }
        break;
      }

      // ==========================================
      // INVOICE PAYMENT SUCCEEDED (Renewal)
      // ==========================================
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Only send for subscription renewals, not initial purchases
        if (invoice.billing_reason === 'subscription_cycle') {
          logStep("Subscription renewal payment succeeded", { invoiceId: invoice.id });
          
          try {
            const customerId = invoice.customer as string;
            const customer = await stripe.customers.retrieve(customerId);
            
            if (!customer.deleted && customer.email) {
              await supabase.functions.invoke('send-subscription-renewed', {
                body: {
                  email: customer.email,
                  name: customer.name || 'Learner',
                  amount: (invoice.amount_paid / 100).toFixed(2),
                  currency: invoice.currency.toUpperCase(),
                  next_billing: new Date((invoice.lines.data[0]?.period?.end || 0) * 1000).toLocaleDateString(),
                },
              });
              logStep("Renewal confirmation email sent");
            }
          } catch (error) {
            logStep("Error in invoice.payment_succeeded handler", { error: String(error) });
          }
        } else {
          logStep("Invoice payment succeeded (not renewal)", { reason: invoice.billing_reason });
        }
        break;
      }

      // ==========================================
      // INVOICE PAYMENT FAILED
      // ==========================================
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment failed", { invoiceId: invoice.id });
        
        try {
          const customerId = invoice.customer as string;
          const customer = await stripe.customers.retrieve(customerId);
          
          if (!customer.deleted && customer.email) {
            await supabase.functions.invoke('send-payment-failed', {
              body: {
                email: customer.email,
                name: customer.name || 'Learner',
                amount: ((invoice.amount_due || 0) / 100).toFixed(2),
                currency: (invoice.currency || 'USD').toUpperCase(),
              },
            });
            logStep("Payment failed notification sent");
          }
        } catch (error) {
          logStep("Error in invoice.payment_failed handler", { error: String(error) });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    logStep("Event processing completed", { type: event.type, id: event.id });
  } catch (processingError) {
    // Log errors but don't throw - we already returned 200
    logStep("CRITICAL: Async processing error", { 
      eventId: event.id, 
      eventType: event.type, 
      error: String(processingError) 
    });
  }
}

// Main webhook handler
serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  
  // STEP 1: Validate signature header exists
  if (!signature) {
    logStep("ERROR: No stripe-signature header");
    return new Response("No signature", { status: 400 });
  }

  // STEP 2: Validate webhook secret is configured
  if (!webhookSecret) {
    logStep("ERROR: STRIPE_WEBHOOK_SECRET not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  try {
    // STEP 3: Read request body
    const body = await req.text();
    
    // STEP 4: Verify webhook signature
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });
    
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    
    logStep("Event received and verified", { type: event.type, id: event.id });

    // STEP 5: Start async processing (DO NOT AWAIT)
    // This ensures we return 200 immediately while processing continues
    processEventAsync(event);

    // STEP 6: IMMEDIATELY return 200 OK
    // This is critical - Stripe expects response within 20 seconds
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Webhook signature verification failed", { error: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});

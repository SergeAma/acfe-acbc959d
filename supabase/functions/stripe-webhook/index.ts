import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  
  if (!signature) {
    logStep("ERROR: No stripe-signature header");
    return new Response("No signature", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    
    logStep("Event received", { type: event.type, id: event.id });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    switch (event.type) {
      case "customer.subscription.deleted":
      case "customer.subscription.canceled": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        logStep("Subscription canceled/deleted", { subscriptionId: subscription.id, customerId });

        // Get customer email from Stripe
        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted) {
          logStep("Customer was deleted");
          break;
        }

        const customerEmail = customer.email;
        logStep("Customer email found", { email: customerEmail });

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

        logStep("User found", { userId: user.id });

        // Update course purchases to mark subscription as cancelled
        const { error: updateError } = await supabase
          .from('course_purchases')
          .update({ status: 'cancelled' })
          .eq('student_id', user.id)
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) {
          logStep("Error updating purchase status", { error: updateError.message });
        } else {
          logStep("Purchase status updated to cancelled");
        }

        // Send cancellation email notification
        try {
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
        } catch (emailError) {
          logStep("Error sending cancellation email", { error: String(emailError) });
        }

        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        logStep("Subscription created", { subscriptionId: subscription.id, customerId });

        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted && customer.email) {
          try {
            await supabase.functions.invoke('send-subscription-created', {
              body: {
                email: customer.email,
                name: customer.name || 'Learner',
                subscription_start: new Date(subscription.current_period_start * 1000).toLocaleDateString(),
              },
            });
            logStep("Subscription created email sent");
          } catch (emailError) {
            logStep("Error sending subscription created email", { error: String(emailError) });
          }
        }
        break;
      }

      case "customer.subscription.paused": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        logStep("Subscription paused", { subscriptionId: subscription.id, customerId });

        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted && customer.email) {
          try {
            await supabase.functions.invoke('send-subscription-paused', {
              body: {
                email: customer.email,
                name: customer.name || 'Learner',
              },
            });
            logStep("Subscription paused email sent");
          } catch (emailError) {
            logStep("Error sending subscription paused email", { error: String(emailError) });
          }
        }
        break;
      }

      case "customer.subscription.resumed": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        logStep("Subscription resumed", { subscriptionId: subscription.id, customerId });

        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted && customer.email) {
          try {
            await supabase.functions.invoke('send-subscription-resumed', {
              body: {
                email: customer.email,
                name: customer.name || 'Learner',
                next_billing: new Date(subscription.current_period_end * 1000).toLocaleDateString(),
              },
            });
            logStep("Subscription resumed email sent");
          } catch (emailError) {
            logStep("Error sending subscription resumed email", { error: String(emailError) });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { 
          subscriptionId: subscription.id, 
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end 
        });

        // If subscription is set to cancel at period end, send reminder
        if (subscription.cancel_at_period_end) {
          const customerId = subscription.customer as string;
          const customer = await stripe.customers.retrieve(customerId);
          
          if (!customer.deleted && customer.email) {
            try {
              await supabase.functions.invoke('send-subscription-ending-reminder', {
                body: {
                  email: customer.email,
                  name: customer.name || 'Learner',
                  subscription_end: new Date(subscription.current_period_end * 1000).toLocaleDateString(),
                },
              });
              logStep("Subscription ending reminder sent");
            } catch (emailError) {
              logStep("Error sending reminder email", { error: String(emailError) });
            }
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Only send for subscription renewals, not initial purchases
        if (invoice.billing_reason === 'subscription_cycle') {
          const customerId = invoice.customer as string;
          const customer = await stripe.customers.retrieve(customerId);
          
          if (!customer.deleted && customer.email) {
            logStep("Subscription renewed", { customerId, amount: invoice.amount_paid });
            
            try {
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
            } catch (emailError) {
              logStep("Error sending renewal email", { error: String(emailError) });
            }
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        
        if (!customer.deleted && customer.email) {
          logStep("Payment failed", { customerId, invoiceId: invoice.id });
          
          try {
            await supabase.functions.invoke('send-payment-failed', {
              body: {
                email: customer.email,
                name: customer.name || 'Learner',
                amount: ((invoice.amount_due || 0) / 100).toFixed(2),
                currency: (invoice.currency || 'USD').toUpperCase(),
              },
            });
            logStep("Payment failed notification sent");
          } catch (emailError) {
            logStep("Error sending payment failed email", { error: String(emailError) });
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Webhook error", { error: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});

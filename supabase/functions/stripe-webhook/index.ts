import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { escapeHtml } from "../_shared/html-escape.ts";

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Tier configuration - maps product IDs to tier details
const SUBSCRIPTION_TIERS: Record<string, { 
  name: string; 
  nameFr: string;
  benefits: string[]; 
  benefitsFr: string[];
}> = {
  'prod_TkCdNAxRmKONyc': {
    name: 'ACFE Membership',
    nameFr: 'Abonnement ACFE',
    benefits: [
      'Unlimited access to all courses',
      'Course completion certificates',
      'Community forum access',
    ],
    benefitsFr: [
      'Accès illimité à tous les cours',
      'Certificats de fin de cours',
      'Accès au forum communautaire',
    ],
  },
  'prod_TkDR4mktfjQo8r': {
    name: 'ACFE Mentorship Plus',
    nameFr: 'ACFE Mentorat Plus',
    benefits: [
      'Everything in Membership',
      'Priority mentor support sessions',
      '1-on-1 career coaching',
      'Resume and portfolio review',
    ],
    benefitsFr: [
      'Tout dans Abonnement',
      'Sessions de mentorat prioritaires',
      'Coaching carrière individuel',
      'Révision CV et portfolio',
    ],
  },
};

// Default benefits for unknown tiers
const DEFAULT_TIER = {
  name: 'ACFE Premium',
  nameFr: 'ACFE Premium',
  benefits: [
    'Full platform access',
    'Course completion certificates',
    'Community features',
  ],
  benefitsFr: [
    'Accès complet à la plateforme',
    'Certificats de fin de cours',
    'Fonctionnalités communautaires',
  ],
};

// Check if event has already been processed (replay protection)
async function checkEventIdempotency(supabase: any, eventId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('stripe_webhook_events')
    .select('id')
    .eq('id', eventId)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    logStep("Error checking event idempotency", { error: error.message });
    return false; // Proceed with processing if check fails
  }
  
  return !!data; // Return true if event already exists
}

// Mark event as processed
async function markEventProcessed(supabase: any, eventId: string, eventType: string): Promise<void> {
  await supabase
    .from('stripe_webhook_events')
    .insert({ id: eventId, event_type: eventType })
    .single();
}

// Log subscription lifecycle event
async function logSubscriptionLifecycle(
  supabase: any,
  subscriptionId: string,
  customerId: string | null,
  userId: string | null,
  eventType: string,
  previousStatus: string | null,
  newStatus: string | null,
  metadata: Record<string, any> = {}
): Promise<void> {
  await supabase
    .from('subscription_lifecycle_logs')
    .insert({
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      user_id: userId,
      event_type: eventType,
      previous_status: previousStatus,
      new_status: newStatus,
      metadata,
    });
}

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
    // REPLAY PROTECTION: Check if event already processed
    const alreadyProcessed = await checkEventIdempotency(supabase, event.id);
    if (alreadyProcessed) {
      logStep("Event already processed (replay protection)", { id: event.id });
      return;
    }
    
    // Mark event as being processed
    await markEventProcessed(supabase, event.id, event.type);
    
    logStep("Processing event asynchronously", { type: event.type, id: event.id });

    switch (event.type) {
      // ==========================================
      // CHECKOUT COMPLETED - Initial purchase/subscription
      // This is the SOLE source of subscription confirmation emails
      // ==========================================
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { 
          sessionId: session.id, 
          mode: session.mode,
          paymentStatus: session.payment_status,
          customerId: session.customer 
        });

        // Get customer email (escape for logging, raw for lookup)
        const customerEmail = session.customer_details?.email || session.customer_email;
        const customerName = session.customer_details?.name || 'Learner';
        
        // SECURITY: Escape user-provided data for email rendering
        const safeCustomerName = escapeHtml(customerName);

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
              firstName: escapeHtml(customerName.split(' ')[0]),
              courseTitle: escapeHtml(courseTitle),
              amount: amountTotal,
              isSubscription: isSubscription,
              isTrial: false,
            },
          });
          logStep("Purchase confirmation email sent", { email: customerEmail });
        } catch (emailError) {
          logStep("Error sending purchase confirmation", { error: String(emailError) });
        }

        // Send subscription confirmation with full details
        if (isSubscription && session.subscription) {
          try {
            // Fetch full subscription details from Stripe
            const subscriptionId = typeof session.subscription === 'string' 
              ? session.subscription 
              : session.subscription.id;
            
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            
            // Get price and product information - fetch separately to avoid deep expansion
            const priceId = subscription.items.data[0]?.price?.id;
            const price = priceId ? await stripe.prices.retrieve(priceId) : null;
            const productId = price?.product as string;
            const product = productId ? await stripe.products.retrieve(productId) : null;
            
            // Get tier details
            const tierConfig = productId && SUBSCRIPTION_TIERS[productId] 
              ? SUBSCRIPTION_TIERS[productId] 
              : DEFAULT_TIER;
            
            // Calculate next billing date from Stripe's actual period end
            const nextBillingDate = new Date(subscription.current_period_end * 1000);
            
            // Check for applied discount/coupon
            let discountInfo: { code: string; percentOff?: number; amountOff?: number } | null = null;
            let originalPrice = (price?.unit_amount || 0) / 100;
            let discountedPrice = amountTotal;
            
            if (subscription.discount) {
              const coupon = subscription.discount.coupon;
              discountInfo = {
                code: subscription.discount.promotion_code 
                  ? (typeof subscription.discount.promotion_code === 'string' 
                    ? subscription.discount.promotion_code 
                    : subscription.discount.promotion_code.code)
                  : coupon.name || 'Discount applied',
                percentOff: coupon.percent_off || undefined,
                amountOff: coupon.amount_off ? coupon.amount_off / 100 : undefined,
              };
              logStep("Discount detected", discountInfo);
            }
            
            // Get user language preference
            const { data: userData } = await supabase.auth.admin.listUsers();
            const user = userData?.users?.find(u => u.email === customerEmail);
            let language: 'en' | 'fr' = 'en';
            
            if (user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('preferred_language')
                .eq('id', user.id)
                .single();
              if (profile?.preferred_language === 'fr') {
                language = 'fr';
              }
            }
            
            await supabase.functions.invoke('send-subscription-created', {
              body: {
                email: customerEmail,
                name: customerName,
                language,
                // Tier information
                tier_name: language === 'fr' ? tierConfig.nameFr : tierConfig.name,
                tier_benefits: language === 'fr' ? tierConfig.benefitsFr : tierConfig.benefits,
                // Billing information
                subscription_start: new Date(subscription.current_period_start * 1000).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
                  year: 'numeric', month: 'long', day: 'numeric'
                }),
                next_billing_date: nextBillingDate.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
                  year: 'numeric', month: 'long', day: 'numeric'
                }),
                billing_interval: subscription.items.data[0]?.price?.recurring?.interval || 'month',
                // Pricing
                amount_paid: discountedPrice,
                original_price: originalPrice,
                currency: (price?.currency || 'usd').toUpperCase(),
                // Discount information
                discount_applied: discountInfo !== null,
                discount_code: discountInfo?.code || null,
                discount_percent: discountInfo?.percentOff || null,
                discount_amount: discountInfo?.amountOff || null,
              },
            });
            logStep("Subscription created email sent with full details", { 
              email: customerEmail,
              tier: tierConfig.name,
              hasDiscount: discountInfo !== null,
              nextBilling: nextBillingDate.toISOString(),
            });
          } catch (emailError) {
            logStep("Error sending subscription created email", { error: String(emailError) });
          }
        }
        break;
      }

      // ==========================================
      // SUBSCRIPTION CREATED - DISABLED FOR EMAIL
      // Email is now ONLY sent from checkout.session.completed to prevent duplicates
      // This handler is kept for logging/database operations only
      // ==========================================
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        logStep("Subscription created (no email - handled by checkout)", { 
          subscriptionId: subscription.id, 
          customerId,
          status: subscription.status 
        });
        // NO EMAIL SENT - checkout.session.completed handles this
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

          // Find user by email and get profile
          const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
          if (userError) {
            logStep("Error listing users", { error: userError.message });
            break;
          }

          const user = userData.users.find(u => u.email === customerEmail);
          let language: 'en' | 'fr' = 'en';
          let fullName = customer.name || 'Learner';
          
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, preferred_language')
              .eq('id', user.id)
              .single();
            
            if (profile?.full_name) fullName = profile.full_name;
            if (profile?.preferred_language === 'fr') language = 'fr';
            
            // Update course purchases status
            await supabase
              .from('course_purchases')
              .update({ status: 'cancelled' })
              .eq('student_id', user.id)
              .eq('stripe_subscription_id', subscription.id);
          }

          // Get tier information from subscription
          const priceId = subscription.items.data[0]?.price?.id;
          const price = priceId ? await stripe.prices.retrieve(priceId) : null;
          const productId = price?.product as string;
          const tierConfig = productId && SUBSCRIPTION_TIERS[productId] 
            ? SUBSCRIPTION_TIERS[productId] 
            : DEFAULT_TIER;

          // Format dates properly
          const subscriptionEnd = new Date(subscription.current_period_end * 1000);
          const formattedEndDate = subscriptionEnd.toLocaleDateString(
            language === 'fr' ? 'fr-FR' : 'en-US', 
            { year: 'numeric', month: 'long', day: 'numeric' }
          );

          // Send cancellation email with full details
          await supabase.functions.invoke('send-subscription-cancelled', {
            body: {
              email: customerEmail,
              name: fullName,
              subscription_end: formattedEndDate,
              language,
              tier_name: language === 'fr' ? tierConfig.nameFr : tierConfig.name,
            },
          });
          logStep("Cancellation email sent", { 
            email: customerEmail, 
            tier: tierConfig.name,
            endDate: formattedEndDate,
            language 
          });
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
          if (customer.deleted || !customer.email) break;

          // Get user profile for name and language
          const { data: userData } = await supabase.auth.admin.listUsers();
          const user = userData?.users?.find(u => u.email === customer.email);
          let language: 'en' | 'fr' = 'en';
          let fullName = customer.name || 'Learner';
          
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, preferred_language')
              .eq('id', user.id)
              .single();
            if (profile?.full_name) fullName = profile.full_name;
            if (profile?.preferred_language === 'fr') language = 'fr';
          }

          // Get tier information
          const priceId = subscription.items.data[0]?.price?.id;
          const price = priceId ? await stripe.prices.retrieve(priceId) : null;
          const productId = price?.product as string;
          const tierConfig = productId && SUBSCRIPTION_TIERS[productId] 
            ? SUBSCRIPTION_TIERS[productId] 
            : DEFAULT_TIER;

          await supabase.functions.invoke('send-subscription-paused', {
            body: {
              email: customer.email,
              name: fullName,
              language,
              tier_name: language === 'fr' ? tierConfig.nameFr : tierConfig.name,
            },
          });
          logStep("Subscription paused email sent", { tier: tierConfig.name, language });
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
          if (customer.deleted || !customer.email) break;

          // Get user profile for name and language
          const { data: userData } = await supabase.auth.admin.listUsers();
          const user = userData?.users?.find(u => u.email === customer.email);
          let language: 'en' | 'fr' = 'en';
          let fullName = customer.name || 'Learner';
          
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, preferred_language')
              .eq('id', user.id)
              .single();
            if (profile?.full_name) fullName = profile.full_name;
            if (profile?.preferred_language === 'fr') language = 'fr';
          }

          // Get tier and pricing info
          const priceId = subscription.items.data[0]?.price?.id;
          const price = priceId ? await stripe.prices.retrieve(priceId) : null;
          const productId = price?.product as string;
          const tierConfig = productId && SUBSCRIPTION_TIERS[productId] 
            ? SUBSCRIPTION_TIERS[productId] 
            : DEFAULT_TIER;

          const nextBillingDate = new Date(subscription.current_period_end * 1000);
          const formattedNextBilling = nextBillingDate.toLocaleDateString(
            language === 'fr' ? 'fr-FR' : 'en-US',
            { year: 'numeric', month: 'long', day: 'numeric' }
          );

          await supabase.functions.invoke('send-subscription-resumed', {
            body: {
              email: customer.email,
              name: fullName,
              next_billing: formattedNextBilling,
              language,
              tier_name: language === 'fr' ? tierConfig.nameFr : tierConfig.name,
              amount: ((price?.unit_amount || 0) / 100).toFixed(2),
              currency: (price?.currency || 'usd').toUpperCase(),
            },
          });
          logStep("Subscription resumed email sent", { tier: tierConfig.name, language });
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
            
            if (customer.deleted || !customer.email) break;

            // Get user profile for name and language
            const { data: userData } = await supabase.auth.admin.listUsers();
            const user = userData?.users?.find(u => u.email === customer.email);
            let language: 'en' | 'fr' = 'en';
            let fullName = customer.name || 'Learner';
            
            if (user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, preferred_language')
                .eq('id', user.id)
                .single();
              if (profile?.full_name) fullName = profile.full_name;
              if (profile?.preferred_language === 'fr') language = 'fr';
            }

            // Get tier info
            const priceId = subscription.items.data[0]?.price?.id;
            const price = priceId ? await stripe.prices.retrieve(priceId) : null;
            const productId = price?.product as string;
            const tierConfig = productId && SUBSCRIPTION_TIERS[productId] 
              ? SUBSCRIPTION_TIERS[productId] 
              : DEFAULT_TIER;

            const endDate = new Date(subscription.current_period_end * 1000);
            const formattedEndDate = endDate.toLocaleDateString(
              language === 'fr' ? 'fr-FR' : 'en-US',
              { year: 'numeric', month: 'long', day: 'numeric' }
            );

            await supabase.functions.invoke('send-subscription-ending-reminder', {
              body: {
                email: customer.email,
                name: fullName,
                subscription_end: formattedEndDate,
                language,
                tier_name: language === 'fr' ? tierConfig.nameFr : tierConfig.name,
              },
            });
            logStep("Subscription ending reminder sent", { tier: tierConfig.name, language });
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
            
            if (customer.deleted || !customer.email) break;

            // Get user profile for name and language
            const { data: userData } = await supabase.auth.admin.listUsers();
            const user = userData?.users?.find(u => u.email === customer.email);
            let language: 'en' | 'fr' = 'en';
            let fullName = customer.name || 'Learner';
            
            if (user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, preferred_language')
                .eq('id', user.id)
                .single();
              if (profile?.full_name) fullName = profile.full_name;
              if (profile?.preferred_language === 'fr') language = 'fr';
            }

            // Get tier info from invoice line items
            const lineItem = invoice.lines.data[0];
            const priceId = lineItem?.price?.id;
            const price = priceId ? await stripe.prices.retrieve(priceId) : null;
            const productId = price?.product as string;
            const tierConfig = productId && SUBSCRIPTION_TIERS[productId] 
              ? SUBSCRIPTION_TIERS[productId] 
              : DEFAULT_TIER;

            const nextBillingDate = new Date((lineItem?.period?.end || 0) * 1000);
            const formattedNextBilling = nextBillingDate.toLocaleDateString(
              language === 'fr' ? 'fr-FR' : 'en-US',
              { year: 'numeric', month: 'long', day: 'numeric' }
            );

            await supabase.functions.invoke('send-subscription-renewed', {
              body: {
                email: customer.email,
                name: fullName,
                amount: (invoice.amount_paid / 100).toFixed(2),
                currency: invoice.currency.toUpperCase(),
                next_billing: formattedNextBilling,
                language,
                tier_name: language === 'fr' ? tierConfig.nameFr : tierConfig.name,
              },
            });
            logStep("Renewal confirmation email sent", { tier: tierConfig.name, language });
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

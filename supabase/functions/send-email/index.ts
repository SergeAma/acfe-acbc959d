import { Resend } from 'npm:resend@4.0.0';
import { verifyServiceRole, corsHeaders } from '../_shared/auth.ts';
import type { SendEmailRequest, EmailType } from '../_shared/email-types.ts';
import type { Language } from './templates/_translations.ts';

import { buildWelcomeEmail } from './templates/welcome.ts';
import { buildPaymentEmail } from './templates/payment.ts';
import { buildSubscriptionEmail } from './templates/subscription.ts';
import { buildMagicLinkEmail, buildPasswordResetEmail, buildEmailConfirmationEmail } from './templates/magic-link.ts';
import { buildInstitutionEmail } from './templates/institution.ts';
import { buildEventEmail } from './templates/event.ts';
import { buildMentorEmail } from './templates/mentor.ts';
import { buildNewsletterWelcomeEmail } from './templates/newsletter.ts';
import { buildAdminEmail } from './templates/admin.ts';

const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);

/**
 * ACFE Universal Email Sender
 * 
 * This is the ONLY function that sends emails in the entire system.
 * All other functions must call this function to send emails.
 * 
 * Security: Requires service role key (internal function-to-function calls only)
 * Bilingual: Automatically detects user's preferred language
 * Branding: All emails use canonical ACFE template
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Only callable by other edge functions with service role key
    const { supabase } = await verifyServiceRole(req);
    
    const request: SendEmailRequest = await req.json();
    const { type, to, data, userId, language: overrideLanguage, subjectOverride } = request;
    
    console.log(`[EMAIL] Sending ${type} to ${to}`);
    
    // LANGUAGE DETECTION: Override > User preference > Default to English
    let language: Language = 'en';
    if (overrideLanguage) {
      language = overrideLanguage;
    } else if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('id', userId)
        .single();
      language = profile?.preferred_language === 'fr' ? 'fr' : 'en';
    }
    
    console.log(`[EMAIL] Language: ${language}, UserId: ${userId || 'none'}`);
    
    let subject: string;
    let html: string;
    
    // TEMPLATE SELECTION: All emails use canonical template with bilingual support
    switch (type as EmailType) {
      // Authentication & Onboarding
      case 'welcome': {
        const result = buildWelcomeEmail(data, language);
        subject = result.subject;
        html = result.html;
        break;
      }
      case 'magic-link': {
        const result = buildMagicLinkEmail(data, language);
        subject = result.subject;
        html = result.html;
        break;
      }
      case 'password-reset': {
        const result = buildPasswordResetEmail(data, language);
        subject = result.subject;
        html = result.html;
        break;
      }
      case 'email-confirmation': {
        const result = buildEmailConfirmationEmail(data, language);
        subject = result.subject;
        html = result.html;
        break;
      }
      
      // Payments
      case 'payment-confirmation': {
        const result = buildPaymentEmail(data, language);
        subject = result.subject;
        html = result.html;
        break;
      }
      
      // Subscriptions (all 6 types)
      case 'subscription-created':
      case 'subscription-renewed':
      case 'subscription-ending':
      case 'subscription-cancelled':
      case 'subscription-paused':
      case 'subscription-resumed': {
        const result = buildSubscriptionEmail(type, data, language);
        subject = result.subject;
        html = result.html;
        break;
      }
      
      // Institutions
      case 'institution-invitation':
      case 'institution-approved':
      case 'institution-request': {
        const result = buildInstitutionEmail(type, data, language);
        subject = result.subject;
        html = result.html;
        break;
      }
      
      // Events
      case 'event-confirmation':
      case 'event-reminder': {
        const result = buildEventEmail(type, data, language);
        subject = result.subject;
        html = result.html;
        break;
      }
      
      // Mentors & Assignment Submissions
      case 'mentor-invitation':
      case 'mentor-approved':
      case 'mentor-rejected':
      case 'mentor-request-confirmation':
      case 'mentor-assignment-submitted':
      case 'assignment-submission-confirmation':
      case 'assignment-feedback':
      case 'assignment-approved': {
        const result = buildMentorEmail(type, data, language);
        subject = result.subject;
        html = result.html;
        break;
      }
      
      // Newsletter
      case 'newsletter-welcome': {
        const result = buildNewsletterWelcomeEmail(data, language);
        subject = result.subject;
        html = result.html;
        break;
      }
      
      // Admin notifications
      case 'admin-new-student': {
        const result = buildAdminEmail(type, data, language);
        subject = result.subject;
        html = result.html;
        break;
      }
      
      default:
        throw new Error(`Unknown email type: ${type}`);
    }
    
    // Allow subject override if provided
    if (subjectOverride) {
      subject = subjectOverride;
    }
    
    // SEND EMAIL via Resend
    const result = await resend.emails.send({
      from: 'A Cloud for Everyone <noreply@acloudforeveryone.org>',
      to: [to],
      subject,
      html
    });
    
    if (result.error) {
      console.error('[EMAIL] Resend error:', result.error);
      throw new Error(result.error.message || 'Resend API error');
    }
    
    console.log(`[EMAIL] Success. ID: ${result.data?.id}, Type: ${type}, To: ${to}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: result.data?.id, 
        language,
        type 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[EMAIL] Failed:', errorMessage);
    
    const status = errorMessage.includes('Service role') ? 401 : 500;
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

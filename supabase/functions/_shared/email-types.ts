/**
 * ACFE Email System - Centralized Type Definitions
 * All email types and their data structures
 */

import type { WelcomeEmailData } from '../send-email/templates/welcome.ts';
import type { PaymentEmailData } from '../send-email/templates/payment.ts';
import type { MagicLinkEmailData } from '../send-email/templates/magic-link.ts';
import type { SubscriptionEmailData } from '../send-email/templates/subscription.ts';
import type { InstitutionEmailData } from '../send-email/templates/institution.ts';
import type { EventEmailData } from '../send-email/templates/event.ts';
import type { MentorEmailData } from '../send-email/templates/mentor.ts';
import type { NewsletterEmailData } from '../send-email/templates/newsletter.ts';
import type { AdminEmailData } from '../send-email/templates/admin.ts';

// Re-export for convenience
export type {
  WelcomeEmailData,
  PaymentEmailData,
  MagicLinkEmailData,
  SubscriptionEmailData,
  InstitutionEmailData,
  EventEmailData,
  MentorEmailData,
  NewsletterEmailData,
  AdminEmailData
};

/**
 * All supported email types in the system
 */
export type EmailType = 
  // Authentication & Onboarding
  | 'welcome'
  | 'magic-link'
  | 'password-reset'
  | 'email-confirmation'
  
  // Payments
  | 'payment-confirmation'
  
  // Subscriptions
  | 'subscription-created'
  | 'subscription-renewed'
  | 'subscription-ending'
  | 'subscription-cancelled'
  | 'subscription-paused'
  | 'subscription-resumed'
  
  // Institutions
  | 'institution-invitation'
  | 'institution-approved'
  | 'institution-request'
  
  // Events
  | 'event-confirmation'
  | 'event-reminder'
  
  // Mentors & Assignments
  | 'mentor-invitation'
  | 'mentor-approved'
  | 'mentor-rejected'
  | 'mentor-request-confirmation'
  | 'mentor-assignment-submitted'
  | 'assignment-submission-confirmation'
  | 'assignment-feedback'
  
  // Newsletter
  | 'newsletter-welcome'
  
  // Courses
  | 'course-enrolled'
  | 'course-completed'
  | 'certificate-issued'
  
  // Admin notifications
  | 'admin-new-student';

/**
 * Type-safe email data mapping
 */
export type EmailData<T extends EmailType> = 
  T extends 'welcome' ? WelcomeEmailData :
  T extends 'magic-link' | 'password-reset' | 'email-confirmation' ? MagicLinkEmailData :
  T extends 'payment-confirmation' ? PaymentEmailData :
  T extends 'subscription-created' | 'subscription-renewed' | 'subscription-ending' | 'subscription-cancelled' | 'subscription-paused' | 'subscription-resumed' ? SubscriptionEmailData :
  T extends 'institution-invitation' | 'institution-approved' | 'institution-request' ? InstitutionEmailData :
  T extends 'event-confirmation' | 'event-reminder' ? EventEmailData :
  T extends 'mentor-invitation' | 'mentor-approved' | 'mentor-rejected' | 'mentor-request-confirmation' | 'mentor-assignment-submitted' | 'assignment-submission-confirmation' | 'assignment-feedback' ? MentorEmailData :
  T extends 'newsletter-welcome' ? NewsletterEmailData :
  T extends 'course-enrolled' | 'course-completed' | 'certificate-issued' ? CourseEmailData :
  T extends 'admin-new-student' ? AdminEmailData :
  never;

/**
 * Course-related email data
 */
export interface CourseEmailData {
  userName?: string;
  courseName: string;
  courseUrl?: string;
  certificateUrl?: string;
}

/**
 * Universal send email request structure
 */
export interface SendEmailRequest<T extends EmailType = EmailType> {
  /** Email type determines which template to use */
  type: T;
  
  /** Recipient email address */
  to: string;
  
  /** Type-safe data for the email template */
  data: EmailData<T>;
  
  /** Optional user ID for tracking */
  userId?: string;
  
  /** Language preference (defaults to 'en') */
  language?: 'en' | 'fr';
  
  /** Optional custom subject override */
  subjectOverride?: string;
}

/**
 * Email send response
 */
export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

# A Cloud for Everyone (ACFE) - Complete System Inventory

**Generated:** 2026-02-02  
**Purpose:** Forensic system discovery for external auditors  
**Application:** Digital Skills Training Platform for African Youth

---

## A) SITE MAP

### Public Routes (No Authentication Required)

| Route | Page Component | Description |
|-------|---------------|-------------|
| `/` | Landing | Homepage with hero video, features, CTAs |
| `/home` | Landing | Alias for homepage |
| `/mentors` | Mentors | Browse approved mentor directory |
| `/mentors/:id` | MentorProfile | Individual mentor public profile |
| `/partners` | Partners | Partner organizations showcase |
| `/pricing` | Pricing | Subscription plans and pricing |
| `/jobs` | Jobs | Job listings (Spectrogram integration) |
| `/submit-idea` | SubmitIdea | Startup idea submission form |
| `/startups` | SubmitIdea | Alias for idea submission |
| `/verify-certificate` | VerifyCertificate | Public certificate verification |
| `/certificate/:certificateId` | CertificatePublic | Public certificate display |
| `/privacy` | PrivacyPolicy | Privacy policy page |
| `/terms` | TermsOfService | Terms of service page |
| `/auth` | Auth | Login/Signup with magic link |
| `/courses` | Courses | Browse all published courses |
| `/courses/:id` | CourseDetail | Course description and enrollment |
| `/courses/:id/preview` | CoursePreview | Course preview for mentors |
| `/career-centre` | CareerCentreLanding | Institution career centre landing |
| `/career-centre/:slug` | InstitutionCareerCentre | Institution-specific career centre |
| `/connect-acfe` | SpectrogramConnect | Spectrogram integration connection |
| `/spectrogram-connect` | SpectrogramConnect | Alias for Spectrogram connection |
| `/spectrogram-jobs` | SpectrogramJobs | Jobs via Spectrogram |
| `/accept-mentor-invite` | AcceptMentorInvite | Mentor invitation acceptance |
| `/donation-success` | DonationSuccess | Post-donation thank you page |

### Protected Routes (Authentication Required)

| Route | Page Component | Required Role | Description |
|-------|---------------|---------------|-------------|
| `/dashboard` | Dashboard | Any authenticated | User dashboard (role-based view) |
| `/courses/:id/learn` | CourseLearn | Any authenticated | Course learning interface |
| `/profile` | ProfileSettings | Any authenticated | User profile settings |
| `/certificates` | MyCertificates | Any authenticated | User's earned certificates |
| `/subscriptions` | MySubscriptions | Any authenticated | Subscription management |
| `/mentor-application-status` | MentorApplicationStatus | Any authenticated | Mentor application tracking |
| `/mentor-contract` | MentorContractAgreement | Any authenticated | Mentor contract signing |
| `/learner-agreement` | LearnerAgreement | Any authenticated | Learner agreement signing |
| `/payment-success` | PaymentSuccess | Any authenticated | Post-payment confirmation |
| `/moderator/:slug` | ModeratorDashboard | Any authenticated | Institution moderator dashboard |

### Admin-Only Routes

| Route | Page Component | Description |
|-------|---------------|-------------|
| `/admin` | AdminDashboard | Admin overview dashboard |
| `/admin/users` | AdminUsers | User management |
| `/admin/settings` | AdminSettings | Platform settings |
| `/admin/ideas` | AdminIdeaSubmissions | Review idea submissions |
| `/admin/newsletter` | AdminNewsletter | Newsletter management |
| `/admin/contacts` | AdminContacts | Contact/CRM management |
| `/admin/email-templates` | AdminEmailTemplates | Email template editor |
| `/admin/email-sequences` | AdminEmailSequences | Email automation sequences |
| `/admin/email-analytics` | AdminEmailAnalytics | Email performance metrics |
| `/admin/email-logs` | AdminEmailLogs | Email delivery logs |
| `/admin/news-curation` | AdminNewsCuration | Tech news curation |
| `/admin/mentor-invitations` | AdminMentorInvitations | Mentor invitation management |
| `/admin/learner-analytics` | AdminLearnerAnalytics | Learner engagement metrics |
| `/admin/pricing` | AdminPricing | Pricing configuration |
| `/admin/revenue` | AdminRevenue | Revenue dashboard |
| `/admin/institutions` | AdminInstitutions | Institution management |
| `/admin/donors` | AdminDonors | Donor management |
| `/admin/translations` | AdminTranslations | Translation overrides |
| `/admin/courses` | AdminCourses | Course management |
| `/admin/courses/new` | AdminCreateCourse | Create new course |
| `/admin/courses/:courseId/build` | AdminCourseBuilder | Course content builder |
| `/admin/mentor-view` | AdminMentorView | View as mentor (testing) |
| `/admin/email-preview` | AdminEmailPreview | Email template preview |
| `/admin/mass-mailer` | AdminMassMailer | Bulk email sending |
| `/admin/broadcasts` | AdminBroadcasts | Broadcast message management |
| `/admin/messages` | AdminMessagesOversight | Private message oversight |

### Mentor/Contributor Routes

| Route | Page Component | Required Role | Description |
|-------|---------------|---------------|-------------|
| `/contributor/submit` | ContributorSubmit | mentor | Content submission portal |
| `/mentor/courses` | MentorCourses | admin | Course management (admin only) |
| `/mentor/courses/new` | CreateCourse | admin | Create course (admin only) |
| `/mentor/courses/:courseId/build` | AdminCourseBuilder | admin | Build course (admin only) |
| `/mentor/cohort` | MentorCohort | admin | Cohort management |
| `/mentor/sessions` | MentorSessions | admin | Session management |
| `/cohort/community` | CohortCommunity | admin | Cohort community |

### Catch-All Route
| Route | Page Component | Description |
|-------|---------------|-------------|
| `*` | NotFound | 404 page |

---

## B) FEATURE LIST

### Navigation & Layout
- **Navbar**: Responsive navigation with role-based menu items
- **Footer**: Site links, social media, newsletter signup
- **PageBreadcrumb**: Hierarchical navigation breadcrumbs
- **ScrollToTop**: Automatic scroll to top on route change
- **LanguageToggle**: EN/FR language switching
- **AdminRoleSwitcher**: Admin role simulation for testing

### Authentication Features
- **Magic Link Authentication**: Passwordless email-based login
- **OTP Verification**: 6-digit code verification
- **Session Management**: sessionStorage-based with 24hr expiry
- **Role-Based Access Control**: admin, mentor, student roles
- **Cloudflare Turnstile**: Bot protection on auth forms

### User Dashboard
- **StudentDashboard**: Enrolled courses, progress, recommendations
- **MentorDashboard**: Course management, student oversight
- **SubscriptionStatus**: Current plan display and management
- **NotificationDropdown**: In-app notifications
- **OnboardingBanner**: First-time user guidance

### Course System
- **Course Catalog**: Browseable course listings with filters
- **CourseDetail**: Full course description, mentor info, enrollment CTA
- **CourseLearn**: Video player, sidebar navigation, progress tracking
- **CourseSidebar**: Section/lesson navigation
- **SecureVideoPlayer**: Protected video playback with signed URLs
- **YouTubeLessonPlayer**: YouTube embedded content
- **SecureAudioContent**: Protected audio playback
- **LessonContentRenderer**: Multi-format content display
- **NotesPanel**: Personal note-taking per lesson
- **CourseQuiz**: In-course assessments
- **CourseAssignment**: Assignment submission interface
- **CourseAssessments**: Assessment overview
- **CourseCertificate**: Certificate generation and display
- **CoursePrerequisitesDisplay**: Prerequisite course requirements

### Mentor Features
- **MentorCard**: Mentor profile card display
- **MentorProfile**: Full mentor profile page
- **MentorRecommendationForm**: Mentor referral form
- **MentorSessionBooking**: Book paid mentorship sessions
- **MentorshipRequestDialog**: Request mentorship relationship
- **MentorAvailabilitySettings**: Set availability slots
- **MentorAgreementCard**: Contract status display
- **SubmissionsReview**: Review student submissions
- **CourseAnalytics**: Course performance metrics

### Institution/Career Centre
- **InstitutionCareerCentre**: Institution-branded career portal
- **InstitutionOverview**: Institution dashboard overview
- **InstitutionStudentsTab**: Student management
- **InstitutionAnnouncementsTab**: Announcements management
- **InstitutionEventsTab**: Events management
- **InstitutionReportsTab**: Analytics and reports
- **InstitutionSettingsTab**: Institution settings
- **ModeratorDashboard**: Moderator-specific dashboard
- **InstitutionAuthGate**: Institution access control
- **InstitutionMembershipGate**: Membership verification

### Payment Features
- **Pricing Page**: Subscription tier comparison
- **PromoCodeInput**: Discount code validation
- **DonationDialog**: Donation form with amount selection
- **Stripe Checkout**: Secure payment processing
- **Customer Portal**: Subscription self-service

### Communication
- **Private Messaging**: Mentor-to-mentor messaging
- **MentorMessagesTab**: Message inbox
- **Cohort Community**: Group discussion space
- **Newsletter Signup**: Email list subscription

### Admin Features
- **User Management**: CRUD operations, role assignment
- **Course Builder**: Section/lesson/content creation
- **Email Template Editor**: HTML template management
- **Mass Mailer**: Bulk email campaigns
- **Broadcasts**: Role-based announcements
- **News Curation**: Tech news feed management
- **Translation Management**: i18n overrides
- **Revenue Dashboard**: Payment analytics
- **Learner Analytics**: Engagement metrics
- **Security Audit Panel**: Security status overview

### Interactive Elements
- **VideoRecorderDialog**: In-browser video recording
- **RichTextEditor**: TipTap-based WYSIWYG editor
- **ThumbnailCropDialog**: Image cropping for uploads
- **AddToCalendarButton**: Calendar event generation
- **Confetti**: Celebration animation
- **HeroVideoBackground**: Animated hero section
- **CompanyLogos**: Partner logo carousel
- **TechNewsSection**: Curated tech news feed

### Forms
- **Auth Form**: Login/signup with validation
- **Profile Settings Form**: User profile editing
- **Mentor Application Form**: Request mentor role
- **Idea Submission Form**: Startup pitch form
- **Institution Inquiry Form**: Career centre interest form
- **Assignment Submission Form**: File/text/video upload
- **Referral Form**: Institution referral form

---

## C) INTEGRATIONS

### Supabase (Primary Backend)
- **Purpose**: Database, authentication, storage, edge functions
- **Database**: PostgreSQL with 55+ tables
- **Auth**: Magic link (OTP), session management
- **Storage Buckets**: avatars, idea-videos, email-assets, course-videos, course-thumbnails, course-files
- **Edge Functions**: 70+ serverless functions

### Stripe (Payments)
- **Purpose**: Payment processing, subscriptions, donations
- **Features Used**:
  - Checkout Sessions (one-time and subscription)
  - Customer Portal
  - Webhooks
  - Coupons/Promotion Codes
- **Products**:
  - Membership ($20/month)
  - Mentorship Plus ($30/month)
  - Course purchases (variable pricing)
  - Mentorship sessions ($20/session default)
  - Donations (one-time and recurring)

### Resend (Email)
- **Purpose**: Transactional email delivery
- **Sender**: noreply@acloudforeveryone.org
- **Features**: HTML templates, personalization, tracking

### Cloudflare Turnstile
- **Purpose**: Bot protection
- **Implementation**: Auth forms, public submissions

### Spectrogram
- **Purpose**: Job board integration, career profiles
- **Features**: Token-based authentication, profile sync

### YouTube/Vimeo
- **Purpose**: External video hosting
- **Implementation**: Embedded players in course content

---

## D) DATA FLOWS

### User Registration Flow
1. User fills signup form (name, email, LinkedIn, university)
2. Data stored in sessionStorage
3. Magic link sent via Supabase Auth
4. User clicks link → OTP verification
5. Profile created in `profiles` table
6. Role assigned in `user_roles` table
7. Welcome email sent via edge function
8. Optional: Mentor application created in `mentor_role_requests`

### Course Enrollment Flow
1. User views course on `/courses/:id`
2. If paid course → Stripe Checkout created
3. Webhook confirms payment → `course_purchases` updated
4. Enrollment created in `enrollments` table
5. User redirected to `/courses/:id/learn`
6. Progress tracked in `video_progress` table

### Subscription Flow
1. User selects plan on `/pricing`
2. Stripe Checkout Session created
3. User completes payment
4. Webhook fires → `user_subscriptions` created/updated
5. Email confirmation sent
6. Access granted to gated content

### Content Delivery Flow
1. User requests lesson content
2. RLS policy checks enrollment (`is_enrolled_in_course_content`)
3. Edge function generates signed URL
4. Secure player fetches content
5. Progress saved to database

### Assignment Submission Flow
1. Student uploads file/text/video
2. File stored in `course-files` bucket
3. Submission record created in `assignment_submissions`
4. Notification sent to mentor
5. Mentor reviews, provides feedback
6. Status updated, student notified

---

## E) AUTH MODEL

### Authentication Provider
- **Primary**: Supabase Auth
- **Method**: Magic Link (OTP-based)
- **OTP Length**: 6 digits
- **OTP Expiry**: 600 seconds (10 minutes)

### Login Methods
1. **Magic Link**: Email → Click link → Authenticated
2. **OTP Code**: Email → Enter 6-digit code → Authenticated
3. **Admin Exception**: sergebushoki@icloud.com can use password

### Session Handling
- **Storage**: sessionStorage (clears on browser close)
- **Max Lifetime**: 24 hours
- **Token Refresh**: Automatic via Supabase SDK
- **Tracking**: `user_sessions` table logs session activity

### User Roles
| Role | Permissions |
|------|------------|
| `student` | View courses, enroll, submit assignments |
| `mentor` | Submit content, view cohort students |
| `admin` | Full platform access, user management |

### Role Assignment
- **Source of Truth**: `user_roles` table
- **Fallback**: `profiles.role` column (legacy)
- **Functions**: `get_user_role()`, `has_role()`

### Protected Content
- Course video/audio files (signed URLs)
- Assignment submissions
- Private messages
- Admin dashboards
- User profile data (own profile only)

### Access Control Functions
- `is_enrolled_in_course_content(file_name)` - Verify enrollment for content access
- `is_course_mentor_for_content(file_name)` - Verify mentor owns content
- `is_institution_member(_user_id, _institution_id)` - Verify institution membership
- `is_institution_moderator(_institution_id, _user_id)` - Verify moderator status
- `can_send_private_message(_sender_id, _recipient_id)` - Verify messaging permission
- `has_signed_learner_agreement(_user_id)` - Verify learner agreement
- `has_signed_mentor_contract(_user_id)` - Verify mentor contract

---

## F) EMAIL SYSTEM

### Email Provider
- **Service**: Resend
- **Sender Domain**: acloudforeveryone.org
- **From Address**: noreply@acloudforeveryone.org

### Email Templates (Supabase Auth)
| Template | Subject | Purpose |
|----------|---------|---------|
| confirmation.html | Your ACFE login code | Signup verification |
| magic_link.html | Your ACFE login code | Sign-in OTP |
| email_change.html | Confirm your new email address | Email change verification |

### Edge Function Email Triggers

#### Authentication & Onboarding
| Function | Trigger | Purpose |
|----------|---------|---------|
| send-welcome-email | User signup complete | Welcome message |
| send-newsletter-welcome | Newsletter signup | Newsletter confirmation |
| send-mentor-welcome-email | Mentor role granted | Mentor onboarding |
| send-mentor-invitation | Admin invites mentor | Invitation email |
| send-mentor-approval-email | Mentor request approved | Approval notification |
| send-mentor-rejection-email | Mentor request rejected | Rejection notification |

#### Course & Learning
| Function | Trigger | Purpose |
|----------|---------|---------|
| send-purchase-confirmation | Course purchased | Purchase receipt |
| send-certificate-email | Certificate issued | Certificate notification |
| send-course-completion-notification | Course completed | Completion notification |
| send-live-session-reminder | Before live session | Session reminder |

#### Subscriptions
| Function | Trigger | Purpose |
|----------|---------|---------|
| send-subscription-created | New subscription | Welcome to plan |
| send-subscription-renewed | Subscription renews | Renewal confirmation |
| send-subscription-cancelled | Subscription cancelled | Cancellation confirmation |
| send-subscription-paused | Subscription paused | Pause confirmation |
| send-subscription-resumed | Subscription resumed | Resume confirmation |
| send-subscription-ending-reminder | Before expiry | Renewal reminder |
| send-payment-failed | Payment failure | Payment issue alert |

#### Donations
| Function | Trigger | Purpose |
|----------|---------|---------|
| send-donation-welcome | Donation received | Thank you message |
| send-donor-report | Quarterly/annual | Impact report |

#### Communication
| Function | Trigger | Purpose |
|----------|---------|---------|
| send-private-message-notification | New message | Message alert |
| send-mentorship-request-notification | Mentorship requested | Request notification |
| send-mentorship-response-notification | Mentor responds | Response notification |
| send-session-notification | Session booked | Booking confirmation |
| send-broadcast | Admin broadcast | Mass communication |
| send-mass-email | Admin campaign | Marketing email |
| send-newsletter | Newsletter scheduled | Newsletter delivery |
| send-weekly-newsletter | Weekly schedule | Weekly digest |
| send-weekly-mentor-reminder | Weekly schedule | Mentor engagement |
| send-weekly-student-reminder | Weekly schedule | Student engagement |

#### Institutions
| Function | Trigger | Purpose |
|----------|---------|---------|
| send-institution-inquiry | Career centre inquiry | Sales lead |
| send-institution-invitation | Student invited | Institution invite |
| send-institution-request-notification | Mentor requests access | Admin notification |
| send-institution-request-response | Request processed | Response notification |

#### Ideas & Other
| Function | Trigger | Purpose |
|----------|---------|---------|
| send-idea-confirmation | Idea submitted | Submission receipt |
| send-idea-status-email | Idea status changed | Status update |
| send-mentor-recommendation | Mentor recommended | Referral notification |
| send-mentor-request-confirmation | Mentor application | Application receipt |
| send-test-email | Admin testing | Template testing |

---

## G) DEPLOYMENT STACK

### Hosting
- **Platform**: Lovable Cloud
- **Preview URL**: https://id-preview--f2dacede-27b3-4a85-ab12-f158cbf5386d.lovable.app
- **Production URL**: https://acfe.lovable.app

### Frontend Framework
- **Framework**: React 18.3.1
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix primitives)

### Backend Framework
- **Platform**: Supabase (Lovable Cloud)
- **Database**: PostgreSQL
- **Functions**: Deno Edge Functions
- **Auth**: Supabase Auth

### Environment Variables
| Variable | Purpose |
|----------|---------|
| VITE_SUPABASE_URL | Supabase API endpoint |
| VITE_SUPABASE_PUBLISHABLE_KEY | Supabase anon key |
| VITE_SUPABASE_PROJECT_ID | Project identifier |

### Server-Side Secrets
| Secret | Purpose |
|--------|---------|
| SUPABASE_SERVICE_ROLE_KEY | Admin database access |
| SUPABASE_DB_URL | Direct database connection |
| STRIPE_SECRET_KEY | Stripe API access |
| STRIPE_WEBHOOK_SECRET | Webhook verification |
| RESEND_API_KEY | Email sending |
| TURNSTILE_SECRET_KEY | Bot protection verification |
| ACFE_SHARED_SECRET | Internal API authentication |
| LOVABLE_API_KEY | Lovable platform access |

### Key Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| @supabase/supabase-js | ^2.86.0 | Supabase client |
| @tanstack/react-query | ^5.83.0 | Data fetching/caching |
| react-router-dom | ^6.30.1 | Routing |
| @tiptap/react | ^3.12.1 | Rich text editor |
| recharts | ^2.15.4 | Charts/analytics |
| zod | ^3.25.76 | Schema validation |
| date-fns | ^3.6.0 | Date utilities |
| dompurify | ^3.3.1 | HTML sanitization |

---

## H) DATABASE SCHEMA

### Core Tables (55 total)

#### User & Auth
- `profiles` - User profile data
- `user_roles` - Role assignments (source of truth)
- `user_sessions` - Session tracking
- `learner_agreements` - Learner contract signatures
- `mentor_contracts` - Mentor contract signatures

#### Courses & Content
- `courses` - Course metadata
- `course_sections` - Course section organization
- `course_content` - Lesson content (video, audio, text, files)
- `course_assignments` - Assignment definitions
- `course_quizzes` - Quiz definitions
- `quiz_questions` - Quiz question bank
- `quiz_options` - Answer options
- `quiz_attempts` - Student quiz attempts
- `course_certificates` - Issued certificates
- `course_prerequisites` - Course dependencies
- `external_course_prerequisites` - External resource links

#### Enrollments & Progress
- `enrollments` - Course enrollments
- `video_progress` - Video watch progress
- `assignment_submissions` - Student submissions
- `user_notes` - Lesson notes
- `user_bookmarks` - Content bookmarks

#### Payments & Subscriptions
- `user_subscriptions` - Active subscriptions
- `course_purchases` - One-time purchases
- `donations` - Donation records
- `subscription_lifecycle_logs` - Subscription events
- `stripe_webhook_events` - Webhook deduplication

#### Mentorship
- `mentor_role_requests` - Mentor applications
- `mentor_invitations` - Admin invitations
- `mentor_availability` - Schedule slots
- `mentorship_requests` - Student requests
- `mentorship_sessions` - Booked sessions
- `mentor_course_topics` - Content topics
- `mentor_institution_requests` - Institution access requests

#### Institutions
- `institutions` - Organization records
- `institution_admins` - Admin assignments
- `institution_moderators` - Moderator assignments
- `institution_students` - Student memberships
- `institution_cohorts` - Student groups
- `institution_cohort_members` - Cohort membership
- `institution_announcements` - Announcements
- `institution_events` - Events
- `institution_broadcasts` - Mass messages
- `institution_threads` - Discussion threads
- `institution_reminders` - Admin reminders
- `institution_job_visibility` - Job board config

#### Communication
- `private_messages` - Direct messages
- `cohort_messages` - Group messages
- `notifications` - In-app notifications
- `community_posts` - Community content

#### Email & Marketing
- `contacts` - CRM contacts
- `contact_tags` - Contact categorization
- `tags` - Tag definitions
- `email_templates` - Email designs
- `email_sequences` - Automation sequences
- `email_sequence_steps` - Sequence steps
- `email_logs` - Delivery tracking
- `scheduled_newsletters` - Newsletter queue
- `admin_broadcasts` - Broadcast records
- `broadcast_recipients` - Recipient tracking

#### Content & Admin
- `idea_submissions` - Startup pitches
- `referrals` - Institution referrals
- `curated_news` - Tech news articles
- `translation_overrides` - i18n customization
- `platform_settings` - Global configuration
- `platform_moderators` - Platform-level moderators
- `admin_audit_logs` - Admin action logs

#### Automation
- `automation_rules` - Automation definitions
- `automation_actions` - Rule actions
- `automation_executions` - Execution logs

### Database Views
- `profiles_public` - Public-safe profile data
- `pending_notifications` - Unactioned notifications
- `unread_message_counts` - Message count aggregation

### Database Functions (20+)
- `handle_new_user()` - Trigger for new user creation
- `get_user_role(_user_id)` - Get highest priority role
- `has_role(_user_id, _role)` - Check role membership
- `is_mentor(_user_id)` - Check mentor status
- `is_enrolled_in_course_content(file_name)` - Verify content access
- `is_course_mentor_for_content(file_name)` - Verify mentor ownership
- `is_institution_member(_user_id, _institution_id)` - Check membership
- `is_institution_moderator(_institution_id, _user_id)` - Check moderator
- `is_platform_moderator(_user_id)` - Check platform moderator
- `can_send_private_message(_sender_id, _recipient_id)` - Check messaging permission
- `has_signed_learner_agreement(_user_id)` - Verify agreement
- `has_signed_mentor_contract(_user_id)` - Verify contract
- `get_public_mentor_profiles()` - List eligible mentors
- `get_public_mentor_profile(mentor_id)` - Get single mentor
- `get_course_mentor_profile(course_mentor_id)` - Get course mentor
- `get_conversation_partners(_user_id)` - Get message threads
- `get_conversation_messages(_user_id, _partner_id)` - Get thread messages
- `get_user_institutions(_user_id)` - Get user's institutions
- `get_broadcast_recipients(...)` - Build recipient list
- `approve_mentor_request(_request_id, _admin_id)` - Approve mentor
- `reject_mentor_request(_request_id, _admin_id)` - Reject mentor
- `reinstate_mentor(_admin_id, _user_id)` - Restore mentor role
- `accept_mentor_invitation(_token, _user_id)` - Accept invite
- `validate_mentor_invitation(_token)` - Check invite validity
- `claim_institution_invitation(_user_id, _institution_id)` - Claim invite
- `auto_claim_institution_invitations()` - Auto-claim trigger
- `is_notification_action_completed(_action_type, _action_reference_id)` - Check action status
- `log_admin_action(_admin_id, _action, _target_user_id, _metadata)` - Audit logging

---

## I) STORAGE BUCKETS

| Bucket | Public | Purpose |
|--------|--------|---------|
| avatars | Yes | User profile photos |
| idea-videos | No | Startup pitch videos |
| email-assets | Yes | Email template images |
| course-videos | No | Lesson video content |
| course-thumbnails | Yes | Course cover images |
| course-files | No | Lesson files/documents |

---

## J) EDGE FUNCTIONS (70+)

### Authentication & User Management
- `accept-institution-invitation` - Claim institution invite
- `generate-spectrogram-token` - Create Spectrogram auth token
- `handle-mentor-action` - Process mentor HMAC actions

### Course & Content
- `get-signed-content-url` - Generate signed content URLs
- `verify-course-payment` - Confirm course purchase

### Payments & Subscriptions
- `create-course-checkout` - Course purchase checkout
- `create-subscription-checkout` - Subscription checkout
- `create-donation-checkout` - Donation checkout
- `create-session-checkout` - Mentorship session checkout
- `confirm-session-payment` - Verify session payment
- `check-subscription` - Verify subscription status
- `manage-subscription` - Pause/resume subscription
- `customer-portal` - Stripe portal session
- `get-subscription-price` - Fetch subscription pricing
- `get-session-price` - Fetch session pricing
- `update-subscription-price` - Admin price update
- `update-session-price` - Admin session price update
- `validate-promo-code` - Verify discount codes
- `stripe-webhook` - Handle Stripe events
- `verify-donation` - Confirm donation payment

### Coupons
- `create-coupon` - Create Stripe coupon
- `list-coupons` - List active coupons
- `deactivate-coupon` - Disable coupon
- `reactivate-coupon` - Re-enable coupon

### Email Sending (30+)
- See Section F for complete email function list

### Content & Automation
- `fetch-tech-news` - Pull tech news feed
- `auto-translate` - AI translation
- `automation-engine` - Process automation rules
- `newsletter-signup` - Handle newsletter subscriptions
- `process-scheduled-newsletters` - Send queued newsletters
- `submit-referral` - Process referrals
- `email-tracking` - Track email opens/clicks
- `backfill-subscription-notifications` - Migrate notifications

---

## K) SECURITY BASELINE

### Row Level Security (RLS)
- **Status**: Enabled on all user-data tables
- **Linter Warning**: Some tables have RLS enabled but no policies defined

### CORS Configuration
- Handled by Supabase default configuration
- Edge functions include custom CORS headers

### Exposed Endpoints
- All edge functions are exposed via Supabase Functions URL
- JWT verification configured per function in `supabase/config.toml`

### Webhook Verification
- Stripe webhooks verified via `STRIPE_WEBHOOK_SECRET`
- HMAC-signed mentor actions via `ACFE_SHARED_SECRET`

### Security Headers
- Content Security Policy defined in `index.html`
- Allowed sources: self, Cloudflare, Stripe, YouTube, Vimeo

### Rate Limiting
- 3 requests/minute/email on payment forms (application-level)
- Cloudflare Turnstile on public forms

### Known Linter Issues
1. **INFO**: Some tables have RLS enabled without policies
2. **WARN**: Extensions installed in public schema
3. **WARN**: Leaked password protection disabled

---

## L) COMPONENT INVENTORY

### UI Components (shadcn/ui based)
- accordion, alert, alert-dialog, aspect-ratio, autocomplete-input
- avatar, badge, breadcrumb, button, calendar, card, carousel
- chart, checkbox, collapsible, command, context-menu, dialog
- drawer, dropdown-menu, form, hover-card, input, input-otp
- label, menubar, navigation-menu, pagination, password-input
- phone-input, popover, progress, radio-group, resizable
- scroll-area, select, separator, sheet, sidebar, skeleton
- slider, sonner, switch, table, tabs, textarea, toast, toaster
- toggle, toggle-group, tooltip

### Admin Components
- AdminInstitutionRequests, AdminLessonEditor, AdminRoleSwitcher
- AdminSectionEditor, AssignmentBuilder, AutosaveIndicator
- ContentItemEditor, CourseBuilderProgress, CourseDescriptionMedia
- CoursePrerequisites, CourseQuickStats, InstitutionLogoEditor
- InviteMentorDialog, MentorSelector, ModeratorManagement
- QuizBuilder, SectionEditor, SecurityAuditPanel
- SimplifiedLessonEditor, SimplifiedSectionEditor
- StudentProfileDialog, ThumbnailCropDialog, ThumbnailDropzone
- UserStatusManager

### Dashboard Components
- CohortSelector, InstitutionPartnersSection, MentorDashboard
- MentorOnboardingChecklist, MentorOnboardingVideo
- MentorVideoResources, MySubmissions, PendingAssignments
- StudentDashboard, StudentVideoResources, SubscriptionStatus

### Learning Components
- CourseAssessments, CourseAssignment, CourseDescriptionPlayer
- CourseQuiz, CourseSidebar, ExternalVideoPlayer
- LessonContentRenderer, NotesPanel, SecureAudioContent
- SecureContent, SecureVideoPlayer, YouTubeLessonPlayer

### Mentor Components
- ContentSubmissionCard, CourseAnalytics, MentorAgreementCard
- MentorAvailabilitySettings, SubmissionsReview

### Mentorship Components
- MentorSessionBooking, MentorshipRequestDialog

### Institution Components
- InstitutionAuthGate, InstitutionMembershipGate
- InstitutionAnnouncementsTab, InstitutionEventsTab
- InstitutionOverview, InstitutionReportsTab
- InstitutionSettingsTab, InstitutionStudentsTab

### Messaging Components
- MentorMessagesTab

### Profile Components
- OnboardingBanner, ProfileAvatar, ProfilePhotoEditor

### Shared Components
- AddToCalendarButton, CompanyLogos, Confetti, CookieConsent
- CourseBadge, CourseCertificate, DonationDialog, Footer
- FormProgressStepper, HeroVideoBackground, HowToSignUpPopup
- LanguageToggle, MentorCard, MentorRecommendationForm
- NavLink, Navbar, NotificationDropdown, PageBreadcrumb
- PromoCodeInput, ProtectedRoute, ReferralDialog
- RequestMentorRole, RichTextEditor, ScrollToTop
- SupportSection, TechNewsSection, VideoRecorderDialog

---

## M) HOOKS INVENTORY

| Hook | Purpose |
|------|---------|
| use-in-view | Intersection observer for animations |
| use-mobile | Responsive breakpoint detection |
| use-signed-content-url | Generate signed URLs for protected content |
| use-toast | Toast notification system |
| useAutosave | Automatic form saving |
| useCareerReadiness | Career readiness status |
| useClaimInstitutionInvitation | Claim institution invites |
| useInstitution | Institution data fetching |
| useLearnerAgreement | Learner agreement status |
| useMentorContract | Mentor contract status |
| useNotifications | In-app notifications |
| usePrivateMessages | Private messaging |
| usePromoCodeValidation | Promo code validation |
| useSessionTracking | Session activity tracking |
| useTranslations | i18n translations |

---

## N) UTILITY LIBRARIES

| Library | Purpose |
|---------|---------|
| audio-utils.ts | Audio file processing |
| calendar-utils.ts | Calendar event generation |
| content-moderation.ts | Content safety checks |
| html-utils.ts | HTML manipulation |
| sanitize-html.ts | XSS prevention |
| storage-utils.ts | Storage bucket operations |
| translations.ts | Translation strings |
| utils.ts | General utilities (cn, etc.) |
| video-utils.ts | Video file processing |

---

## O) CONTEXT PROVIDERS

| Context | Purpose |
|---------|---------|
| AuthContext | Authentication state, user profile, role simulation |
| LanguageContext | EN/FR language switching |

---

**END OF SYSTEM INVENTORY**

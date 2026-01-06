# Comprehensive Security & Code Audit Report

**Project:** A Cloud For Everyone (ACFE) Platform  
**Date:** January 6, 2026 (Updated)  
**Scope:** Security, Data Safety, Code Structure, and Neatness

---

## Executive Summary

This audit evaluates the ACFE platform across security, data handling, code architecture, and maintainability. The platform demonstrates **strong foundational security** with proper RLS policies, HMAC-signed admin actions, and sanitized HTML rendering. This is an updated comprehensive review following recent feature additions.

**Overall Security Rating:** 🟢 Good (with improvements needed)

---

## Phase 1: Critical Issues (Immediate Action Required)

### 1.1 ❌ Email HTML Injection in Edge Functions
**Location:** `supabase/functions/send-institution-inquiry/index.ts` (lines 142-169)  
**Risk Level:** HIGH - Stored XSS via email  

User-provided values (`institutionName`, `contactName`, `contactEmail`, `message`) are interpolated directly into HTML email templates without escaping.

```typescript
// VULNERABLE CODE
<div class="value">${institutionName}</div>
<div class="value">${message}</div>
```

**Impact:** Attacker can inject malicious HTML/JavaScript into emails sent to ACFE team.

**Fix Required:** Add HTML escaping function (like in `send-idea-confirmation/index.ts`) and apply to all user inputs before HTML interpolation.

---

### 1.2 ❌ Missing HTML Escaping in submit-referral Email
**Location:** `supabase/functions/submit-referral/index.ts` (lines 100-117)  
**Risk Level:** HIGH - Stored XSS via email

Referrer and referred names/companies are directly interpolated into notification email HTML without escaping.

```typescript
// VULNERABLE CODE
<p><strong>Name:</strong> ${referrer.firstName} ${referrer.lastName}</p>
```

**Fix Required:** Implement `escapeHtml()` function and sanitize all user inputs.

---

### 1.3 ❌ donations Table Allows Unauthenticated Inserts
**Location:** Database RLS policy on `donations` table  
**Risk Level:** MEDIUM-HIGH - Abuse potential

```sql
CREATE POLICY "Anyone can create donations" 
ON public.donations FOR INSERT 
WITH CHECK (true);
```

While the edge function `create-donation-checkout` validates data, direct database access via Supabase client could bypass validation.

**Impact:** Spam entries, database pollution, potential for abuse.

**Fix Required:** Add CAPTCHA token verification requirement or ensure inserts only come via the edge function.

---

### 1.4 ❌ Donation Checkout Missing CAPTCHA Verification
**Location:** `supabase/functions/create-donation-checkout/index.ts`  
**Risk Level:** MEDIUM-HIGH - Bot abuse

While `DonationDialog.tsx` has Turnstile CAPTCHA on the frontend, the edge function doesn't verify the CAPTCHA token server-side.

**Impact:** Automated submission of donation attempts (though Stripe provides some protection).

**Fix Required:** Add CAPTCHA verification in the edge function similar to `newsletter-signup`.

---

### 1.5 ⚠️ Infrastructure Security Warnings (Platform-Level)
**Location:** Supabase Configuration  
**Status:** Acknowledged - Requires manual dashboard action

- **Leaked Password Protection Disabled** - Should enable in Supabase Auth settings
- **Extension in Public Schema** - `pg_net` extension location (Supabase managed - cannot be changed)

**Action Required:** 
1. Navigate to Supabase Dashboard → Authentication → Settings
2. Enable "Leaked Password Protection"

---

## Phase 2: High Priority Issues

### 2.1 ⚠️ Missing Rate Limiting on Public Edge Functions
**Location:** All edge functions with `verify_jwt = false` in `supabase/config.toml`  
**Risk Level:** MEDIUM-HIGH - DoS/Abuse potential

The following functions lack server-side rate limiting:
- `newsletter-signup`
- `submit-referral`
- `send-idea-confirmation`
- `send-institution-inquiry`
- `stripe-webhook` (verified via Stripe signature)
- `email-tracking`

**Current Protection:**
- Turnstile CAPTCHA verification ✅ (on some)
- Input validation ✅

**Impact:** Automated abuse, email bombing, resource exhaustion.

**Fix Required:** Implement rate limiting using edge function middleware or external rate limiter.

---

### 2.2 ⚠️ profiles_public View Security
**Location:** Supabase database  
**Risk Level:** MEDIUM - Potential data exposure

Security scan flagged that `profiles_public` may lack RLS policies. This appears to be a view designed for public profile data.

**Action Required:** 
1. Verify what columns are exposed in this view
2. Ensure only non-sensitive data (name, bio, public social links) is included
3. Document the intended public access

---

### 2.3 ⚠️ Admin Contact Data Exposure Risk
**Location:** `contacts` table and `referrals` table  
**Risk Level:** MEDIUM - PII exposure if admin compromised

These tables contain emails, names, and phone numbers. While RLS restricts to admins, a compromised admin account exposes all data.

**Mitigations to Add:**
1. Implement audit logging for contact/referral data access
2. Consider encrypting email/phone at rest
3. Add IP-based access restrictions for admin functions

---

### 2.4 ⚠️ Hardcoded Turnstile Site Key in Client Code
**Location:** `src/components/DonationDialog.tsx`, `src/components/ReferralDialog.tsx`  
**Risk Level:** LOW (publishable key, but best practice violation)

```typescript
const TURNSTILE_SITE_KEY = "0x4AAAAAACKo5KDG-bJ1_43d";
```

**Recommendation:** Move to environment variable `VITE_TURNSTILE_SITE_KEY` for consistency and easier key rotation.

---

### 2.5 ⚠️ Client-Side Role Check in ProtectedRoute
**Location:** `src/components/ProtectedRoute.tsx`  
**Risk Level:** Low (mitigated by RLS)  
**Description:** Role checks are performed client-side using `profile?.role`.

**Mitigating Factors:**
- All data operations are protected by RLS policies
- Sensitive operations use `has_role()` SECURITY DEFINER function
- Admin routes still require admin role at the database level

**Status:** ✅ Acceptable - RLS provides server-side enforcement.

---

## Phase 3: Medium Priority Issues

### 3.1 📋 Inconsistent Input Validation Across Edge Functions

**Good Examples:**
- `send-welcome-email/index.ts` - Comprehensive validation (email format, length limits, UUID format)
- `send-idea-confirmation/index.ts` - Length limits, database verification, HTML escaping

**Needs Improvement:**
- `create-donation-checkout/index.ts` - Missing email format validation
- `submit-referral/index.ts` - No length limits on text fields

**Recommendation:** Create a shared validation utility for edge functions.

---

### 3.2 📋 Missing Audit Trail for Sensitive Admin Actions

**Currently Audited:**
- Viewing student PII (via admin_audit_logs)

**Should Also Audit:**
- Mentor approval/rejection
- User role changes
- Contact data exports
- Donation record access
- Platform settings changes

**Location to Extend:** `admin_audit_logs` table and related code.

---

### 3.3 📋 XSS Protection via DOMPurify
**Location:** `src/lib/sanitize-html.ts`  
**Status:** ✅ Excellent

- Properly configured ALLOWED_TAGS and ALLOWED_ATTR
- FORBID_TAGS includes script, style, iframe, form
- FORBID_ATTR includes event handlers (onclick, onerror, etc.)
- Links forced to `target="_blank" rel="noopener noreferrer"`

**Verification:** All `dangerouslySetInnerHTML` usages properly use `createSafeHtml()` or `sanitizeHtml()`.

---

### 3.4 📋 Course Content Storage - Private Bucket Verification
**Location:** `supabase/functions/get-signed-content-url/index.ts`  
**Status:** ✅ Good architecture

The implementation correctly:
- Validates user authentication
- Checks enrollment OR mentor/admin status
- Generates short-lived signed URLs (30 min)
- Handles external URLs appropriately

**Action:** Verify that storage buckets for course content are set to private (not public).

---

### 3.5 📋 Community Posts Content Security
**Location:** `src/pages/Jobs.tsx`  
**Status:** ✅ Good

- Limits post content to 2000 characters
- Renders content as plain text (React auto-escapes)
- Uses RLS for authorization

---

### 3.6 📋 CORS Configuration - Wildcard Origin
**Location:** All edge functions  
**Risk Level:** LOW in this context

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  ...
};
```

While wildcard CORS is used, all sensitive operations either:
- Require JWT authentication
- Verify CAPTCHA tokens
- Only perform write operations via service role

**Consideration:** For production, consider restricting to specific origins.

---

### 3.7 📋 Inconsistent Error Handling in Edge Functions
**Description:** Some functions return detailed error messages while others return generic errors.

**Example (Good - User-friendly):**
```typescript
return new Response(JSON.stringify({ error: "Please complete the CAPTCHA verification" }), ...)
```

**Example (Could expose internals):**
```typescript
return new Response(JSON.stringify({ error: error.message }), ...)
```

**Recommendation:** Standardize error responses with user-friendly messages while logging detailed errors server-side.

---

### 3.8 📋 Duplicate RLS Policy Check Functions
**Location:** Database functions  
**Description:** Two similar functions exist:
- `is_institution_member(_user_id, _institution_id)`
- `is_institution_member_direct(_user_id, _institution_id)`

Both have identical implementations.

**Recommendation:** Consolidate into a single function.

---

## Phase 4: Nice-to-Have Improvements

### 4.1 💡 Code Organization

#### Large Files to Consider Splitting:
| File | Lines | Recommendation |
|------|-------|----------------|
| `AdminInstitutions.tsx` | ~1280 | Split into sub-components |
| `AdminCourseBuilder.tsx` | ~800+ | Extract section/content editors |
| `CourseLearn.tsx` | ~800+ | Split content renderer |
| `Auth.tsx` | ~648 | Extract SignUpForm, SignInForm |
| `Jobs.tsx` | 443 | Split community and jobs tabs |
| `send-welcome-email/index.ts` | 466 | Extract email templates |

#### Positive Patterns Observed:
- Good separation of concerns (components/hooks/contexts)
- Consistent use of React Query for data fetching
- Proper use of TypeScript types
- Reusable UI components via shadcn/ui

---

### 4.2 💡 Missing TypeScript Strict Checks
**Examples of `any` usage:**
- `enrollment: any` in StudentProfileDialog
- `cert: any` in StudentProfileDialog

**Recommendation:** Define proper interfaces for all data structures.

---

### 4.3 💡 Database Optimization

**Consider Adding Indexes:**
- `enrollments(student_id, course_id)` - frequently queried together
- `course_content(section_id, sort_order)` - for ordered retrieval
- `community_posts(created_at)` - for timeline queries

**Query Optimization:**
- The 1000 row default limit in Supabase should be considered when building paginated views

---

### 4.4 💡 Environment Variable Organization

Current state is good with `.env` containing only publishable keys.

**Add:**
- `VITE_TURNSTILE_SITE_KEY` (move from hardcoded)
- Document all required secrets in a `.env.example` file

---

### 4.5 💡 Database Schema Observations

#### Positive Findings:
- ✅ Proper UUID primary keys with `gen_random_uuid()`
- ✅ Timestamps with `now()` defaults
- ✅ Foreign key constraints on critical tables
- ✅ User roles in separate `user_roles` table (security best practice)
- ✅ SECURITY DEFINER functions for role checks

#### Recommendations:
1. Add `updated_at` trigger to tables missing it
2. Consider soft-delete pattern for `course_purchases` and `enrollments`
3. Add indexes on frequently queried columns

---

## Security Architecture Summary

### Authentication Flow ✅
```
User → Supabase Auth → JWT Token → Protected Routes/Edge Functions
```

### Data Access Control ✅
```
Request → JWT Validation → RLS Policy Check → Data
                      ↓
        Service Role (Edge Functions) → Bypasses RLS with explicit checks
```

### Content Protection ✅
```
Request → Auth Check → Enrollment/Admin Check → Signed URL (30min TTL)
```

### Admin Actions ✅
```
Email Action → HMAC Verification → Admin Role Check → Database Update → Audit Log
```

---

## Security Checklist Summary

| Category | Status | Notes |
|----------|--------|-------|
| RLS on all tables | ✅ | All tables have RLS enabled |
| Secrets management | ✅ | All secrets in Supabase, none in frontend |
| XSS prevention | ✅ | DOMPurify with strict config |
| CSRF protection | ✅ | Supabase handles via auth tokens |
| SQL injection | ✅ | Using Supabase SDK (parameterized queries) |
| Role-based access | ✅ | SECURITY DEFINER functions |
| Input validation | ⚠️ | Good on Auth, needs expansion to edge functions |
| Rate limiting | ❌ | CAPTCHA present, no server-side IP limiting |
| Audit logging | ⚠️ | Partial - needs expansion |
| Error handling | ⚠️ | Inconsistent across edge functions |
| Email HTML injection | ❌ | Critical - needs escaping in some functions |

---

## Remediation Priority List

### Week 1 (Critical)
1. [ ] Add HTML escaping to `send-institution-inquiry` email templates
2. [ ] Add HTML escaping to `submit-referral` notification email
3. [ ] Add CAPTCHA verification to `create-donation-checkout`
4. [ ] Enable Leaked Password Protection in Supabase dashboard

### Week 2 (High)
5. [ ] Implement rate limiting middleware for public edge functions
6. [ ] Add audit logging for mentor approval/rejection actions
7. [ ] Move Turnstile site key to environment variable
8. [ ] Verify course content storage buckets are private
9. [ ] Verify and document `profiles_public` view exposure

### Week 3-4 (Medium)
10. [ ] Create shared validation utility for edge functions
11. [ ] Extend audit logging to cover all sensitive admin actions
12. [ ] Standardize error response format across edge functions
13. [ ] Consolidate duplicate `is_institution_member` functions
14. [ ] Add Zod validation to remaining forms

### Ongoing (Nice-to-Have)
15. [ ] Refactor large files (AdminInstitutions, CourseLearn, Auth)
16. [ ] Replace `any` types with proper interfaces
17. [ ] Add database indexes for common queries
18. [ ] Create `.env.example` documentation
19. [ ] Consider field-level encryption for contact PII

---

## Appendix A: Edge Function JWT Configuration

| Function | verify_jwt | Notes |
|----------|------------|-------|
| `stripe-webhook` | false | Verified via Stripe signature |
| `newsletter-signup` | false | Public, CAPTCHA protected |
| `submit-referral` | false | Public, CAPTCHA protected |
| `send-idea-confirmation` | false | Validates submission exists |
| `send-institution-inquiry` | false | CAPTCHA protected |
| `handle-mentor-action` | false | HMAC-signed URLs + admin verification |
| `email-tracking` | false | Tracking pixel endpoint |
| `create-course-checkout` | true | Requires auth ✅ |
| `create-subscription-checkout` | true | Requires auth ✅ |
| `customer-portal` | true | Requires auth ✅ |
| `check-subscription` | true | Requires auth ✅ |
| `generate-spectrogram-token` | true | Requires auth ✅ |

---

## Appendix B: RLS Policy Coverage

| Table | SELECT | INSERT | UPDATE | DELETE | Notes |
|-------|--------|--------|--------|--------|-------|
| `profiles` | User-own, Admin | User-own | User-own | ❌ | Good |
| `courses` | Public (published) | Mentor | Mentor | Mentor | Good |
| `enrollments` | Student, Mentor | Auto | Auto | ❌ | Good |
| `donations` | Admin | **Anyone** ⚠️ | Admin | ❌ | Needs review |
| `contacts` | Admin, User-own | Admin | Admin | Admin | Good |
| `referrals` | Admin | ❌ (via service) | Admin | ❌ | Good |
| `admin_audit_logs` | Admin | Authenticated | ❌ | ❌ | Good |
| `platform_settings` | **Public** | Admin | Admin | Admin | Intentional |

---

## Appendix C: Files Reviewed

### Edge Functions (63 functions reviewed)
- All checkout functions
- All email notification functions
- Webhook handlers
- Authentication-related functions

### Client Components
- Authentication context and protected routes
- Form components with user input
- Content rendering components
- Admin management interfaces

### Configuration
- `supabase/config.toml`
- Environment variables
- RLS policies (via database schema)
- Storage bucket configurations

---

## Conclusion

The ACFE platform demonstrates **mature security practices**:
- Proper separation of roles in a dedicated table
- SECURITY DEFINER functions preventing privilege escalation
- HMAC-signed admin action links
- Comprehensive RLS policies
- Sanitized HTML rendering

**Critical issues requiring immediate attention:**
1. Email HTML injection in edge functions (send-institution-inquiry, submit-referral)
2. Missing CAPTCHA verification on donation checkout

**No data leaks or critical client-side vulnerabilities were identified.**

---

*Audit completed by Lovable AI on January 6, 2026*

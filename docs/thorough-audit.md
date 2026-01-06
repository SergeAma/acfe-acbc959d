# Comprehensive Security & Code Audit Report

**Project:** A Cloud For Everyone (ACFE) Platform  
**Date:** January 6, 2026  
**Scope:** Security, Data Safety, Code Structure, and Neatness

---

## Executive Summary

This audit evaluates the ACFE platform across security, data handling, code architecture, and maintainability. The platform demonstrates **strong foundational security** with proper RLS policies, HMAC-signed admin actions, and sanitized HTML rendering. However, several areas require attention.

**Overall Security Rating:** 🟢 Good (with minor improvements needed)

---

## Phase 1: Critical Issues (Immediate Action Required)

### 1.1 ❌ FIXED - Mentor Role Revocation Not Working Properly
**Status:** Recently Fixed  
**Location:** `src/pages/AdminDashboard.tsx`  
**Description:** The `handleRevokeMentor` function was using UPDATE instead of DELETE on `user_roles` table, and wasn't updating the `mentor_role_requests` status.  
**Fix Applied:** Now properly deletes mentor role and sets request status to 'revoked'.

### 1.2 ⚠️ Overly Permissive Public RLS Policies
**Location:** Database RLS  
**Risk Level:** Medium  
**Findings:**
- `community_posts` - SELECT with `true` (anyone can view all posts) ✅ Acceptable for public community
- `course_certificates` - SELECT with `true` for verification ✅ Intentional for public certificate verification
- `curated_news` - SELECT with `true` ✅ Intentional for public news
- `platform_settings` - SELECT with `true` ✅ Acceptable for public platform config

**Recommendation:** These appear intentional. No action required but document the rationale.

### 1.3 ⚠️ Infrastructure Security Warnings (Platform-Level)
**Location:** Supabase Configuration  
**Status:** Acknowledged - Requires manual dashboard action
- **Leaked Password Protection Disabled** - Should enable in Supabase Auth settings
- **Extension in Public Schema** - `pg_net` extension location (Supabase managed)

**Action Required:** 
1. Navigate to Supabase Dashboard → Authentication → Settings
2. Enable "Leaked Password Protection"

---

## Phase 2: High Priority Issues

### 2.1 ⚠️ Client-Side Role Check in ProtectedRoute
**Location:** `src/components/ProtectedRoute.tsx`  
**Risk Level:** Low (mitigated by RLS)  
**Description:** Role checks are performed client-side using `profile?.role`. While RLS provides server-side enforcement, a sophisticated attacker could potentially manipulate the client state.

**Current Code:**
```typescript
if (requiredRole && profile?.role !== requiredRole) {
  return <Navigate to="/" replace />;
}
```

**Mitigating Factors:**
- All data operations are protected by RLS policies
- Sensitive operations use `has_role()` SECURITY DEFINER function
- Admin routes still require admin role at the database level

**Recommendation:** Add a server-side role verification for admin routes (optional enhancement).

### 2.2 ⚠️ Email Exposure Risk in Admin Profile Fetching
**Location:** `src/components/admin/StudentProfileDialog.tsx`  
**Risk Level:** Low (Admin-only access)  
**Description:** Admins can view student profiles including email addresses. This is appropriate for admin functionality but should be logged for audit trails.

**Recommendation:** Consider adding an audit log for admin profile views.

### 2.3 ⚠️ Profile Email Query Without RLS Protection
**Location:** `src/contexts/AuthContext.tsx`  
**Current Behavior:** The profile fetch uses `.select('*')` which includes email.

**Mitigating Factors:**
- Query is filtered by `auth.uid()` (user's own profile)
- RLS policy `Users can view own profile` restricts access

**Status:** ✅ Acceptable - Users can only view their own profile.

### 2.4 ⚠️ Console Logging of User Data
**Location:** Multiple files in `src/contexts/AuthContext.tsx`  
**Risk Level:** Low  
**Description:** Profile and role data are logged to console during development.

```typescript
console.log('Profile data fetched:', profileData);
console.log('Role data fetched:', roleData);
```

**Recommendation:** 
- Remove or conditionally compile console.log statements in production
- Use a logging library with log levels

---

## Phase 3: Medium Priority Issues

### 3.1 📋 Duplicate RLS Policy Check Functions
**Location:** Database functions  
**Description:** Two similar functions exist:
- `is_institution_member(_user_id, _institution_id)`
- `is_institution_member_direct(_user_id, _institution_id)`

Both have identical implementations.

**Recommendation:** Consolidate into a single function.

### 3.2 📋 Missing Rate Limiting on Edge Functions
**Location:** `supabase/functions/newsletter-signup/index.ts`  
**Risk Level:** Medium  
**Description:** While Turnstile CAPTCHA is implemented, there's no server-side rate limiting.

**Current Protection:**
- Turnstile CAPTCHA verification ✅
- Input validation ✅
- Duplicate email handling ✅

**Recommendation:** Add IP-based rate limiting or use Supabase's built-in rate limiting.

### 3.3 📋 Inconsistent Error Handling in Edge Functions
**Location:** Various edge functions  
**Description:** Some functions return detailed error messages while others return generic errors.

**Example (Good):**
```typescript
// newsletter-signup/index.ts
return new Response(JSON.stringify({ error: "Please complete the CAPTCHA verification" }), ...)
```

**Example (Could expose internals):**
```typescript
// Some functions return error.message directly
return new Response(JSON.stringify({ error: error.message }), ...)
```

**Recommendation:** Standardize error responses with user-friendly messages while logging detailed errors server-side.

### 3.4 📋 Input Validation Inconsistency
**Location:** `src/pages/Auth.tsx`  
**Status:** ✅ Good - Uses Zod validation
- Email: Validated with `.email()` and max length
- Password: Min 6 chars, max 100
- Names: Min 2 chars, max 100
- Phone: Min 10 chars, max 20
- Mentor bio: Min 100 chars with content validation

**Recommendation:** Add similar Zod schemas to other forms (profile settings, course creation).

### 3.5 📋 XSS Protection via DOMPurify
**Location:** `src/lib/sanitize-html.ts`  
**Status:** ✅ Excellent
- Properly configured ALLOWED_TAGS and ALLOWED_ATTR
- FORBID_TAGS includes script, style, iframe, form
- FORBID_ATTR includes event handlers (onclick, onerror, etc.)
- Links forced to `target="_blank" rel="noopener noreferrer"`

**Usage:** All `dangerouslySetInnerHTML` usages found (13 files) properly use `createSafeHtml()` or `sanitizeHtml()`.

---

## Phase 4: Nice-to-Have Improvements

### 4.1 💡 Code Organization

#### Large Files to Refactor:
| File | Lines | Recommendation |
|------|-------|----------------|
| `AdminInstitutions.tsx` | ~1280 | Split into sub-components (StudentTab, EventsTab, etc.) |
| `AdminDashboard.tsx` | ~492 | Extract MentorRequestCard component |
| `CourseLearn.tsx` | ~800+ | Split content renderer into separate components |
| `Auth.tsx` | ~648 | Extract SignUpForm, SignInForm components |

### 4.2 💡 Missing TypeScript Strict Checks
**Location:** Various  
**Examples of `any` usage:**
- `enrollment: any` in StudentProfileDialog
- `cert: any` in StudentProfileDialog
- `request.profiles as { email: string; full_name: string } | null`

**Recommendation:** Define proper interfaces for all data structures.

### 4.3 💡 Unused Database Tables Check
**Tables with potential low usage:**
- `automation_actions` - Check if automation feature is fully implemented
- `automation_executions` - Related to above
- `automation_rules` - Related to above
- `email_sequence_steps` - Verify email sequences feature is active

**Recommendation:** Audit feature usage and remove unused tables/code.

### 4.4 💡 Storage Bucket Consistency
**Current Buckets:**
| Bucket | Public | Purpose |
|--------|--------|---------|
| `avatars` | Yes | Profile photos, institution logos |
| `idea-videos` | No | Startup pitch videos |
| `email-assets` | Yes | Email template images |
| `course-videos` | No | Protected course content |
| `course-files` | Yes | Course downloadable files |

**Issue:** `avatars` bucket stores institution logos. Consider renaming or creating a dedicated `institutions` bucket for clarity.

### 4.5 💡 Environment Variable Best Practices
**Current `.env` (Correct):**
- Only contains publishable/public keys
- No secrets stored in frontend `.env`

**Status:** ✅ Excellent - All secrets are in Supabase Edge Function secrets.

### 4.6 💡 Database Schema Observations

#### Positive Findings:
- ✅ Proper UUID primary keys with `gen_random_uuid()`
- ✅ Timestamps with `now()` defaults
- ✅ Foreign key constraints on critical tables
- ✅ User roles in separate `user_roles` table (security best practice)
- ✅ SECURITY DEFINER functions for role checks

#### Recommendations:
1. Add `updated_at` trigger to tables missing it
2. Consider soft-delete pattern for `course_purchases` and `enrollments`
3. Add indexes on frequently queried columns (e.g., `email` lookups)

---

## Security Checklist Summary

| Category | Status | Notes |
|----------|--------|-------|
| RLS on all tables | ✅ | All 53 tables have RLS enabled |
| Secrets management | ✅ | All secrets in Supabase, none in frontend |
| XSS prevention | ✅ | DOMPurify with strict config |
| CSRF protection | ✅ | Supabase handles via auth tokens |
| SQL injection | ✅ | Using Supabase SDK (parameterized queries) |
| Role-based access | ✅ | SECURITY DEFINER functions |
| Input validation | ⚠️ | Good on Auth, needs expansion |
| Rate limiting | ⚠️ | CAPTCHA present, no IP limiting |
| Audit logging | ⚠️ | Minimal - email_logs only |
| Error handling | ⚠️ | Inconsistent across edge functions |

---

## Recommended Fix Order

### Phase 1 (Critical) - No remaining critical issues
All critical issues have been addressed.

### Phase 2 (High Priority) - Estimated: 2-3 hours
1. Enable Leaked Password Protection in Supabase Dashboard (manual)
2. Remove/conditionally compile console.log statements
3. Add admin action audit logging

### Phase 3 (Medium Priority) - Estimated: 4-6 hours
1. Consolidate duplicate `is_institution_member` functions
2. Standardize error responses in edge functions
3. Add Zod validation to remaining forms

### Phase 4 (Nice-to-Have) - Estimated: 8-12 hours
1. Refactor large components into smaller modules
2. Replace `any` types with proper interfaces
3. Audit and clean unused tables/features
4. Add database indexes for performance

---

## Conclusion

The ACFE platform demonstrates **mature security practices**:
- Proper separation of roles in a dedicated table
- SECURITY DEFINER functions preventing privilege escalation
- HMAC-signed admin action links
- Comprehensive RLS policies
- Sanitized HTML rendering

The main areas for improvement are:
1. Production logging cleanup
2. Form validation consistency
3. Code organization (large files)
4. Audit trail enhancements

**No data leaks or critical security vulnerabilities were identified.**

---

*Audit completed by Lovable AI on January 6, 2026*

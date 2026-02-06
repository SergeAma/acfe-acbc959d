# ACFE EMAIL SYSTEM - INVIOLABLE RULES

⚠️ **READ BEFORE ANY CHANGES**

This is the **ONLY** function that sends emails in the entire ACFE platform.

---

## ABSOLUTE RULES

### RULE 1: SINGLE EMAIL SENDER
- ✅ ONLY `send-email/index.ts` uses Resend
- ✅ All other functions call this function
- ❌ NEVER import Resend in other functions
- ❌ NEVER create new email functions
- ❌ NEVER bypass this function

### RULE 2: BILINGUAL REQUIRED
- ✅ ALL templates support EN & FR
- ✅ User's `preferred_language` determines language
- ✅ Fallback to English if not set
- ❌ NEVER hardcode English-only text
- ❌ NEVER create separate EN/FR functions

### RULE 3: CANONICAL TEMPLATE
- ✅ ALL emails use `buildCanonicalTemplate()`
- ✅ Magic links use ACFE branding
- ✅ Template includes logo, tagline, contact, locations
- ❌ NEVER use plain text emails
- ❌ NEVER modify `_base.ts` without approval

### RULE 4: SECURITY
- ✅ Function verifies service role key
- ✅ Only callable by edge functions/DB triggers
- ❌ NEVER make publicly accessible
- ❌ NEVER remove `verifyServiceRole`

### RULE 5: ADDING NEW EMAIL TYPES
1. Add translations to `templates/_translations.ts` (both EN & FR)
2. Create template builder in `templates/[name].ts`
3. Add type to `_shared/email-types.ts`
4. Add case to switch in `index.ts`
5. Update this README

**DO NOT** create a separate function.

### RULE 6: MODIFICATIONS
- ✅ Can modify template content
- ✅ Can update translations
- ✅ Can update base design (with approval)
- ❌ Cannot modify core sending logic
- ❌ Cannot modify language detection
- ❌ Cannot remove service role check

---

## CALLING THIS FUNCTION

### From Other Edge Functions

```typescript
const emailResponse = await fetch(
  `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'welcome',
      to: userEmail,
      data: { 
        userName: user.full_name, 
        userEmail: user.email 
      },
      userId: user.id  // IMPORTANT: Include for language detection
    })
  }
);

if (!emailResponse.ok) {
  console.error('Email failed:', await emailResponse.text());
  // DO NOT throw - email failure should not break main flow
}
```

### Supported Email Types

| Type | Data Interface | Description |
|------|----------------|-------------|
| `welcome` | `WelcomeEmailData` | New user registration |
| `magic-link` | `MagicLinkEmailData` | Passwordless sign-in |
| `password-reset` | `MagicLinkEmailData` | Password reset link |
| `email-confirmation` | `MagicLinkEmailData` | Email verification |
| `payment-confirmation` | `PaymentEmailData` | Payment receipt |
| `subscription-created` | `SubscriptionEmailData` | New subscription |
| `subscription-renewed` | `SubscriptionEmailData` | Renewal confirmation |
| `subscription-ending` | `SubscriptionEmailData` | Expiry warning |
| `subscription-cancelled` | `SubscriptionEmailData` | Cancellation notice |
| `subscription-paused` | `SubscriptionEmailData` | Pause confirmation |
| `subscription-resumed` | `SubscriptionEmailData` | Resume confirmation |
| `institution-invitation` | `InstitutionEmailData` | Join institution |
| `institution-approved` | `InstitutionEmailData` | Request approved |
| `institution-request` | `InstitutionEmailData` | Admin notification |
| `event-confirmation` | `EventEmailData` | Registration confirm |
| `event-reminder` | `EventEmailData` | Upcoming event |
| `mentor-invitation` | `MentorEmailData` | Become a mentor |
| `mentor-approved` | `MentorEmailData` | Application approved |
| `mentor-rejected` | `MentorEmailData` | Application rejected |
| `mentor-request-confirmation` | `MentorEmailData` | Application received |
| `newsletter-welcome` | `NewsletterEmailData` | Newsletter signup |

---

## FILE STRUCTURE

```
supabase/functions/send-email/
├── index.ts                    # Main sender (DO NOT DUPLICATE)
├── README.md                   # This file
└── templates/
    ├── _base.ts               # Canonical HTML template
    ├── _translations.ts       # EN/FR translations
    ├── welcome.ts             # Welcome email builder
    ├── payment.ts             # Payment confirmation
    ├── subscription.ts        # All subscription emails
    ├── magic-link.ts          # Auth emails (magic link, reset, confirm)
    ├── institution.ts         # Institution-related
    ├── event.ts               # Event emails
    ├── mentor.ts              # Mentor-related
    └── newsletter.ts          # Newsletter emails

supabase/functions/_shared/
└── email-types.ts             # Type definitions
```

---

## VIOLATIONS = SYSTEM BREAKDOWN

Breaking these rules causes:
- 📧 Email fragmentation (30+ functions again)
- 🌍 Broken bilingual support
- 🎨 Inconsistent branding
- 🔐 Security holes
- 🔧 Complete rebuild required

---

## IF TEMPTED TO BREAK RULES

**STOP.** Ask a human first.

The previous system had 30+ fragmented email functions with:
- No consistent branding
- No bilingual support
- Magic links that didn't match ACFE design
- Duplicated Resend imports everywhere
- Security vulnerabilities

This system fixes all of that. Don't break it.

---

## MAINTENANCE

### Adding a Translation
Edit `templates/_translations.ts` and add both `en` and `fr` versions.

### Modifying Template Design
Edit `templates/_base.ts` - requires approval.

### Adding an Email Type
Follow RULE 5 above.

### Debugging
Check logs with: `[EMAIL]` prefix in Supabase Edge Function logs.

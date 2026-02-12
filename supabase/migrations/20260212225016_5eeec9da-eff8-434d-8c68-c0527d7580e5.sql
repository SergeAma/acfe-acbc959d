
-- ============================================================================
-- SECURITY FIX: Remove mentor access to course purchase financial data
-- ============================================================================
-- ISSUE: "Mentors can view purchases for their courses" policy gives mentors
-- access to amount_cents, stripe_payment_intent_id, stripe_checkout_session_id,
-- and stripe_subscription_id. Mentors don't need this data — enrollment info
-- is available via the enrollments table.
-- ============================================================================

DROP POLICY IF EXISTS "Mentors can view purchases for their courses" ON public.course_purchases;

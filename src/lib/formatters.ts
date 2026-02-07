/**
 * Centralized display transformations for database values
 * Converts snake_case/enum values to user-friendly display strings
 */

// Assignment/Submission status mapping
const SUBMISSION_STATUS_MAP: Record<string, string> = {
  'pending': 'Pending Review',
  'approved': 'Approved',
  'rejected': 'Rejected',
  'revision_requested': 'Revision Requested',
  'needs_revision': 'Needs Revision', // Legacy/fallback
  'submitted': 'Submitted',
  'none': 'Not Submitted',
};

// User account status mapping
const ACCOUNT_STATUS_MAP: Record<string, string> = {
  'active': 'Active',
  'suspended': 'Suspended',
  'deleted': 'Deleted',
  'pending': 'Pending',
  'inactive': 'Inactive',
};

// Subscription status mapping
const SUBSCRIPTION_STATUS_MAP: Record<string, string> = {
  'active': 'Active',
  'canceled': 'Cancelled',
  'past_due': 'Past Due',
  'unpaid': 'Unpaid',
  'trialing': 'Trialing',
  'paused': 'Paused',
  'incomplete': 'Incomplete',
  'incomplete_expired': 'Expired',
};

// User role mapping
const ROLE_MAP: Record<string, string> = {
  'admin': 'Admin',
  'mentor': 'Mentor',
  'student': 'Student',
  'institution_moderator': 'Institution Moderator',
};

// Enrollment/Course status mapping
const ENROLLMENT_STATUS_MAP: Record<string, string> = {
  'enrolled': 'Enrolled',
  'completed': 'Completed',
  'in_progress': 'In Progress',
  'not_started': 'Not Started',
  'dropped': 'Dropped',
};

// Institution membership status mapping
const MEMBERSHIP_STATUS_MAP: Record<string, string> = {
  'active': 'Active',
  'pending': 'Pending',
  'invited': 'Invited',
  'suspended': 'Suspended',
  'expired': 'Expired',
};

// Idea submission status mapping
const IDEA_STATUS_MAP: Record<string, string> = {
  'pending': 'Pending Review',
  'approved': 'Approved',
  'rejected': 'Not Selected',
  'under-review': 'Under Review',
};

// Mentorship request status mapping
const MENTORSHIP_STATUS_MAP: Record<string, string> = {
  'pending': 'Request Pending',
  'accepted': 'Accepted',
  'rejected': 'Declined',
  'course_required': 'Course Required',
};

/**
 * Converts a snake_case or enum value to Title Case display string
 * Falls back to auto-formatting if no mapping exists
 */
function autoFormatStatus(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format assignment/submission status for display
 */
export function formatSubmissionStatus(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  return SUBMISSION_STATUS_MAP[status] ?? autoFormatStatus(status);
}

/**
 * Format user account status for display
 */
export function formatAccountStatus(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  return ACCOUNT_STATUS_MAP[status] ?? autoFormatStatus(status);
}

/**
 * Format subscription status for display
 */
export function formatSubscriptionStatus(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  return SUBSCRIPTION_STATUS_MAP[status] ?? autoFormatStatus(status);
}

/**
 * Format user role for display
 */
export function formatRole(role: string | null | undefined): string {
  if (!role) return 'Unknown';
  return ROLE_MAP[role] ?? autoFormatStatus(role);
}

/**
 * Format enrollment status for display
 */
export function formatEnrollmentStatus(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  return ENROLLMENT_STATUS_MAP[status] ?? autoFormatStatus(status);
}

/**
 * Format institution membership status for display
 */
export function formatMembershipStatus(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  return MEMBERSHIP_STATUS_MAP[status] ?? autoFormatStatus(status);
}

/**
 * Format idea submission status for display
 */
export function formatIdeaStatus(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  return IDEA_STATUS_MAP[status] ?? autoFormatStatus(status);
}

/**
 * Format mentorship request status for display
 */
export function formatMentorshipStatus(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  return MENTORSHIP_STATUS_MAP[status] ?? autoFormatStatus(status);
}

/**
 * Generic status formatter - auto-formats any snake_case value
 * Use this as a fallback when you don't know the specific status type
 */
export function formatStatus(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  return autoFormatStatus(status);
}

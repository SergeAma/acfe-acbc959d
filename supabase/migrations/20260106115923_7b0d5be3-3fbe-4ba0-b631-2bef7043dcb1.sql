-- Add indexes on frequently queried columns for better performance

-- Enrollments: Common queries by student_id and course_id
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.enrollments(course_id);

-- Course content: Queries by section_id with ordering
CREATE INDEX IF NOT EXISTS idx_course_content_section_id ON public.course_content(section_id);

-- Lesson progress: Common lookups by enrollment_id
CREATE INDEX IF NOT EXISTS idx_lesson_progress_enrollment_id ON public.lesson_progress(enrollment_id);

-- Contacts: Email lookups and source filtering
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_source ON public.contacts(source);

-- Referrals: Admin filtering and lookups
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_email ON public.referrals(referrer_email);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON public.referrals(created_at DESC);

-- Course purchases: Student and course lookups
CREATE INDEX IF NOT EXISTS idx_course_purchases_student_id ON public.course_purchases(student_id);
CREATE INDEX IF NOT EXISTS idx_course_purchases_course_id ON public.course_purchases(course_id);

-- Quiz attempts: Enrollment lookups
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_enrollment_id ON public.quiz_attempts(enrollment_id);

-- Assignment submissions: Common lookups
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_enrollment_id ON public.assignment_submissions(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON public.assignment_submissions(student_id);

-- Admin audit logs: Admin and target user lookups
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

-- Institution students: Status and institution filtering
CREATE INDEX IF NOT EXISTS idx_institution_students_institution_id ON public.institution_students(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_students_status ON public.institution_students(status);

-- Mentorship sessions: Date-based queries
CREATE INDEX IF NOT EXISTS idx_mentorship_sessions_scheduled_date ON public.mentorship_sessions(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_mentorship_sessions_mentor_id ON public.mentorship_sessions(mentor_id);

-- Course certificates: Enrollment and student lookups
CREATE INDEX IF NOT EXISTS idx_course_certificates_student_id ON public.course_certificates(student_id);
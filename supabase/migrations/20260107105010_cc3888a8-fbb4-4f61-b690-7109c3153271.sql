
-- Create table for mentor-institution requests (for exclusive content and cohort mentoring)
CREATE TABLE public.mentor_institution_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL CHECK (request_type IN ('exclusive_content', 'cohort_mentoring')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reason TEXT,
    admin_response TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(mentor_id, institution_id, request_type)
);

-- Create table for institution cohorts (mentor's institution-specific cohorts)
CREATE TABLE public.institution_cohorts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(mentor_id, institution_id)
);

-- Create table for institution cohort members
CREATE TABLE public.institution_cohort_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    cohort_id UUID NOT NULL REFERENCES public.institution_cohorts(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    UNIQUE(cohort_id, student_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.mentor_institution_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_cohort_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for mentor_institution_requests
CREATE POLICY "Mentors can view their own requests"
ON public.mentor_institution_requests
FOR SELECT
USING (auth.uid() = mentor_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Mentors can create requests"
ON public.mentor_institution_requests
FOR INSERT
WITH CHECK (auth.uid() = mentor_id);

CREATE POLICY "Admins can update requests"
ON public.mentor_institution_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for institution_cohorts
CREATE POLICY "Cohorts visible to mentor, admin, and institution members"
ON public.institution_cohorts
FOR SELECT
USING (
    auth.uid() = mentor_id 
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_institution_member(auth.uid(), institution_id)
);

CREATE POLICY "Admins can create cohorts"
ON public.institution_cohorts
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Mentors and admins can update their cohorts"
ON public.institution_cohorts
FOR UPDATE
USING (auth.uid() = mentor_id OR public.has_role(auth.uid(), 'admin'));

-- RLS policies for institution_cohort_members
CREATE POLICY "Cohort members visible to mentor, admin, and members"
ON public.institution_cohort_members
FOR SELECT
USING (
    auth.uid() = student_id
    OR EXISTS (
        SELECT 1 FROM public.institution_cohorts ic
        WHERE ic.id = cohort_id AND ic.mentor_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Mentors can manage cohort members"
ON public.institution_cohort_members
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.institution_cohorts ic
        WHERE ic.id = cohort_id AND ic.mentor_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
);

-- Create trigger for updated_at
CREATE TRIGGER update_mentor_institution_requests_updated_at
BEFORE UPDATE ON public.mentor_institution_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_institution_cohorts_updated_at
BEFORE UPDATE ON public.institution_cohorts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

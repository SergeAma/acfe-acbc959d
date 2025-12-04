-- Create scheduled_newsletters table
CREATE TABLE public.scheduled_newsletters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  sent_at TIMESTAMP WITH TIME ZONE,
  recipient_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_newsletters ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage scheduled_newsletters" 
ON public.scheduled_newsletters 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_scheduled_newsletters_updated_at
BEFORE UPDATE ON public.scheduled_newsletters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Create contacts table
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  source TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tags table
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create contact_tags junction table
CREATE TABLE IF NOT EXISTS public.contact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(contact_id, tag_id)
);

-- Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create email_sequences table
CREATE TABLE IF NOT EXISTS public.email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create email_sequence_steps table
CREATE TABLE IF NOT EXISTS public.email_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES public.email_sequences(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES public.email_templates(id) ON DELETE CASCADE NOT NULL,
  step_order INTEGER NOT NULL,
  delay_days INTEGER DEFAULT 0,
  delay_hours INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create automation_rules table
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create automation_actions table
CREATE TABLE IF NOT EXISTS public.automation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.automation_rules(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL,
  action_config JSONB NOT NULL,
  action_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create email_logs table
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  sequence_id UUID REFERENCES public.email_sequences(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'sent',
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  error_message TEXT
);

-- Create automation_executions table to track automation runs
CREATE TABLE IF NOT EXISTS public.automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.automation_rules(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admins can manage all automation data
CREATE POLICY "Admins can view contacts" ON public.contacts
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert contacts" ON public.contacts
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update contacts" ON public.contacts
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete contacts" ON public.contacts
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage tags" ON public.tags
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage contact_tags" ON public.contact_tags
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage email_templates" ON public.email_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage email_sequences" ON public.email_sequences
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage email_sequence_steps" ON public.email_sequence_steps
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage automation_rules" ON public.automation_rules
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage automation_actions" ON public.automation_actions
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view email_logs" ON public.email_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view automation_executions" ON public.automation_executions
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Create indexes
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_contact_tags_contact_id ON public.contact_tags(contact_id);
CREATE INDEX idx_contact_tags_tag_id ON public.contact_tags(tag_id);
CREATE INDEX idx_email_sequence_steps_sequence_id ON public.email_sequence_steps(sequence_id);
CREATE INDEX idx_automation_actions_rule_id ON public.automation_actions(rule_id);
CREATE INDEX idx_email_logs_contact_id ON public.email_logs(contact_id);
CREATE INDEX idx_automation_executions_rule_id ON public.automation_executions(rule_id);

-- Insert default welcome email template
INSERT INTO public.email_templates (name, subject, html_content, variables) VALUES
('Welcome Email', 'Welcome to A Cloud for Everyone! 🎓', 
'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to A Cloud for Everyone!</h1>
    </div>
    <div class="content">
      <p>Hi {{first_name}},</p>
      <p>Thank you for joining A Cloud for Everyone! We''re excited to have you as part of our community focused on digital upskilling for African youth.</p>
      <p>🎯 <strong>What''s Next?</strong></p>
      <ul>
        <li>Explore our course catalog</li>
        <li>Enroll in courses that interest you</li>
        <li>Connect with mentors</li>
        <li>Start your learning journey</li>
      </ul>
      <a href="{{dashboard_url}}" class="button">Go to Dashboard</a>
      <p>If you have any questions, feel free to reach out to our support team.</p>
      <p>Best regards,<br>The A Cloud for Everyone Team</p>
    </div>
    <div class="footer">
      <p>© 2024 A Cloud for Everyone. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
'["first_name", "dashboard_url"]'::jsonb);

-- Insert default tags
INSERT INTO public.tags (name, color) VALUES
('New Signup', '#10b981'),
('Student', '#3b82f6'),
('Mentor', '#8b5cf6'),
('Enrolled', '#f59e0b');

-- Insert default welcome sequence
INSERT INTO public.email_sequences (name, description, is_active) VALUES
('Welcome Series', 'Welcome email sequence for new signups', true);

-- Link welcome template to sequence
INSERT INTO public.email_sequence_steps (sequence_id, template_id, step_order, delay_days, delay_hours)
SELECT 
  (SELECT id FROM public.email_sequences WHERE name = 'Welcome Series'),
  (SELECT id FROM public.email_templates WHERE name = 'Welcome Email'),
  1, 0, 0;

-- Insert default automation rule for new signups
INSERT INTO public.automation_rules (name, description, trigger_type, trigger_config, is_active) VALUES
('New User Welcome', 'Automatically send welcome email when a new user signs up', 'user_signup', 
'{"event": "user.created"}'::jsonb, true);

-- Add actions to the welcome automation
INSERT INTO public.automation_actions (rule_id, action_type, action_config, action_order)
SELECT 
  (SELECT id FROM public.automation_rules WHERE name = 'New User Welcome'),
  'create_contact',
  '{}'::jsonb,
  1;

INSERT INTO public.automation_actions (rule_id, action_type, action_config, action_order)
SELECT 
  (SELECT id FROM public.automation_rules WHERE name = 'New User Welcome'),
  'add_tag',
  jsonb_build_object('tag_name', 'New Signup'),
  2;

INSERT INTO public.automation_actions (rule_id, action_type, action_config, action_order)
SELECT 
  (SELECT id FROM public.automation_rules WHERE name = 'New User Welcome'),
  'send_email',
  jsonb_build_object('template_name', 'Welcome Email'),
  3;
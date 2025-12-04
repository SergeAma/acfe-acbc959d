-- Create table for curated news articles
CREATE TABLE public.curated_news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_url TEXT NOT NULL UNIQUE,
  article_title TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  pinned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.curated_news ENABLE ROW LEVEL SECURITY;

-- Anyone can read curated settings (needed for filtering)
CREATE POLICY "Anyone can view curated_news"
ON public.curated_news
FOR SELECT
USING (true);

-- Only admins can manage curated news
CREATE POLICY "Admins can manage curated_news"
ON public.curated_news
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_curated_news_updated_at
BEFORE UPDATE ON public.curated_news
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
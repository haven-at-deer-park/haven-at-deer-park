-- Add missing columns to analytics_sessions
ALTER TABLE public.analytics_sessions 
ADD COLUMN IF NOT EXISTS os text;

-- Add missing columns to analytics_pageviews
ALTER TABLE public.analytics_pageviews 
ADD COLUMN IF NOT EXISTS load_time_ms integer;

-- Rename columns in analytics_pageviews for consistency
ALTER TABLE public.analytics_pageviews 
RENAME COLUMN time_on_page_seconds TO time_on_page_ms;

ALTER TABLE public.analytics_pageviews 
RENAME COLUMN scroll_depth_percent TO scroll_depth;

ALTER TABLE public.analytics_pageviews 
RENAME COLUMN page_path TO path;

ALTER TABLE public.analytics_pageviews 
RENAME COLUMN page_title TO title;

ALTER TABLE public.analytics_pageviews 
RENAME COLUMN timestamp TO viewed_at;

-- Create admin SELECT policies for analytics_sessions
CREATE POLICY "Admins can select analytics_sessions"
ON public.analytics_sessions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create admin SELECT policies for analytics_pageviews
CREATE POLICY "Admins can select analytics_pageviews"
ON public.analytics_pageviews
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
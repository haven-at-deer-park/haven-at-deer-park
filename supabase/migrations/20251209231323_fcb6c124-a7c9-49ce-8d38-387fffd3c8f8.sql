-- Drop existing restrictive policies on analytics_pageviews
DROP POLICY IF EXISTS "Allow public insert on analytics_pageviews" ON public.analytics_pageviews;

-- Create permissive INSERT policy for analytics_pageviews
CREATE POLICY "Allow public insert on analytics_pageviews" 
ON public.analytics_pageviews 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

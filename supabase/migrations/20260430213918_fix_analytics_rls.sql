-- Ensure anon and authenticated users can SELECT their analytics data
-- This is required because PostgREST returns a 42501 (RLS violation) 
-- when performing an INSERT ... RETURNING if the user doesn't have SELECT permission on the returned row.

CREATE POLICY "Allow public select on analytics_pageviews"
ON public.analytics_pageviews
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public select on analytics_sessions"
ON public.analytics_sessions
FOR SELECT
TO anon, authenticated
USING (true);

-- Add missing columns to analytics_sessions if they don't exist
ALTER TABLE public.analytics_sessions ADD COLUMN IF NOT EXISTS device TEXT;
ALTER TABLE public.analytics_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Drop the foreign key constraint on analytics_events if it exists (references old session_id text)
ALTER TABLE public.analytics_events DROP CONSTRAINT IF EXISTS analytics_events_session_id_fkey;

-- Add session_id column as UUID if not exists, page_path and page_title
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS session_id_uuid UUID;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS page_path TEXT;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS page_title TEXT;

-- Update RLS policies for analytics_sessions to allow update
DROP POLICY IF EXISTS "Anyone can update sessions" ON public.analytics_sessions;
CREATE POLICY "Anyone can update sessions" ON public.analytics_sessions FOR UPDATE USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_visitor_id ON public.analytics_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON public.analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_sessions_visitor_id ON public.analytics_sessions(visitor_id);
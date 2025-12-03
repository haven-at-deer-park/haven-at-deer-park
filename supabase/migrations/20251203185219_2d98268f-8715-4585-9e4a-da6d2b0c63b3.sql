-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create admin_users table for admin authentication
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Create user_roles table (separate from admin_users for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.admin_users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Analytics sessions table
CREATE TABLE public.analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  entry_page TEXT,
  exit_page TEXT,
  device_type TEXT,
  browser TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  is_bounce BOOLEAN DEFAULT false,
  is_repeat_visitor BOOLEAN DEFAULT false,
  visitor_id TEXT
);

-- Analytics pageviews table
CREATE TABLE public.analytics_pageviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES public.analytics_sessions(session_id) ON DELETE CASCADE,
  page_path TEXT NOT NULL,
  page_title TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  time_on_page_seconds INTEGER,
  scroll_depth_percent INTEGER,
  visitor_id TEXT
);

-- Analytics events table (extensible for future event types)
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES public.analytics_sessions(session_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_category TEXT,
  event_action TEXT,
  event_label TEXT,
  event_value TEXT,
  page_path TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  visitor_id TEXT
);

-- Analytics traffic sources table
CREATE TABLE public.analytics_traffic_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES public.analytics_sessions(session_id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  medium TEXT,
  campaign TEXT,
  referrer_url TEXT,
  referrer_domain TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Analytics outbound clicks table (specifically for Airbnb tracking)
CREATE TABLE public.analytics_outbound_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES public.analytics_sessions(session_id) ON DELETE CASCADE,
  destination_url TEXT NOT NULL,
  link_text TEXT,
  page_path TEXT,
  button_id TEXT,
  button_class TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  device_type TEXT,
  utm_source TEXT,
  utm_campaign TEXT,
  visitor_id TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_pageviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_traffic_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_outbound_clicks ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for analytics tables (allow public insert for tracking)
CREATE POLICY "Allow public insert on analytics_sessions"
ON public.analytics_sessions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public insert on analytics_pageviews"
ON public.analytics_pageviews FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public insert on analytics_events"
ON public.analytics_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public insert on analytics_traffic_sources"
ON public.analytics_traffic_sources FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public insert on analytics_outbound_clicks"
ON public.analytics_outbound_clicks FOR INSERT
WITH CHECK (true);

-- RLS Policies for analytics tables (allow public update for session ending)
CREATE POLICY "Allow public update on analytics_sessions"
ON public.analytics_sessions FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public update on analytics_pageviews"
ON public.analytics_pageviews FOR UPDATE
USING (true)
WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX idx_sessions_started_at ON public.analytics_sessions(started_at);
CREATE INDEX idx_sessions_visitor_id ON public.analytics_sessions(visitor_id);
CREATE INDEX idx_pageviews_timestamp ON public.analytics_pageviews(timestamp);
CREATE INDEX idx_pageviews_session_id ON public.analytics_pageviews(session_id);
CREATE INDEX idx_events_timestamp ON public.analytics_events(timestamp);
CREATE INDEX idx_events_event_type ON public.analytics_events(event_type);
CREATE INDEX idx_outbound_clicks_timestamp ON public.analytics_outbound_clicks(timestamp);
CREATE INDEX idx_outbound_clicks_destination ON public.analytics_outbound_clicks(destination_url);
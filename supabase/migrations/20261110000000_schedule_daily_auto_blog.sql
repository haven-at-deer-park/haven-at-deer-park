-- Ensure blog_posts table exists and schedule daily SEO blog generation for Haven at Deer Park (havenatdeerpark.com)
-- Runs daily at 04:30 UTC (12:30 PM PHT)

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'Senior Living',
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'published',
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'Public read published blog_posts'
  ) THEN
    CREATE POLICY "Public read published blog_posts"
      ON public.blog_posts FOR SELECT
      USING (status = 'published');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'haven-daily-seo-blog') THEN
    PERFORM cron.unschedule('haven-daily-seo-blog');
  END IF;
END $$;

SELECT cron.schedule(
  'haven-daily-seo-blog',
  '30 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://emvrkeolbpynxkcjpahk.supabase.co/functions/v1/auto-blog',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-trigger', 'true'
    ),
    body := '{"source": "pg_cron_daily"}'::jsonb,
    timeout_milliseconds := 120000
  ) AS request_id;
  $$
);


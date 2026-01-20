-- Add missing columns to analytics_outbound_clicks if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analytics_outbound_clicks' AND column_name = 'clicked_at') THEN
    ALTER TABLE public.analytics_outbound_clicks ADD COLUMN clicked_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;
END $$;

-- Ensure we have SELECT policy for analytics reads
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_outbound_clicks' AND policyname = 'Allow reads for analytics') THEN
    CREATE POLICY "Allow reads for analytics" ON public.analytics_outbound_clicks FOR SELECT USING (true);
  END IF;
END $$;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_outbound_clicks_timestamp ON public.analytics_outbound_clicks(timestamp);
CREATE INDEX IF NOT EXISTS idx_outbound_clicks_destination_url ON public.analytics_outbound_clicks(destination_url);
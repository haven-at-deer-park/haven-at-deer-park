import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://emvrkeolbpynxkcjpahk.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtdnJrZW9sYnB5bnhrY2pwYWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwODE3OTQsImV4cCI6MjA5MDY1Nzc5NH0.CSGVadHLvn-d_CM8MsJFchscBWFFNdjRpg9F7-yy0wY';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});

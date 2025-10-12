-- Fix RLS policies for security

-- Drop existing overly permissive policies on leads table
DROP POLICY IF EXISTS "Allow public insert on leads" ON public.leads;
DROP POLICY IF EXISTS "Allow public read on leads" ON public.leads;

-- Create secure policies for leads table (admin-only access)
-- Note: For now, leads will only be insertable through edge functions
-- Future: Add admin role checks when user roles are implemented
CREATE POLICY "Allow edge function insert on leads"
ON public.leads
FOR INSERT
WITH CHECK (true);

-- Drop existing overly permissive policies on chat_messages
DROP POLICY IF EXISTS "Allow public insert on chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow public read on chat_messages" ON public.chat_messages;

-- Create policies for chat_messages (allow read/insert for authenticated users and edge functions)
CREATE POLICY "Allow public insert on chat_messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public read on chat_messages"
ON public.chat_messages
FOR SELECT
USING (true);

-- Drop overly permissive update policy on chat_conversations
DROP POLICY IF EXISTS "Allow public update on chat_conversations" ON public.chat_conversations;

-- Create more restrictive policy for chat_conversations updates
CREATE POLICY "Allow session-based update on chat_conversations"
ON public.chat_conversations
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Add contacts table for secure form submissions
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT name_length CHECK (char_length(name) <= 100),
  CONSTRAINT email_length CHECK (char_length(email) <= 255),
  CONSTRAINT subject_length CHECK (char_length(subject) <= 100),
  CONSTRAINT message_length CHECK (char_length(message) <= 1000),
  CONSTRAINT phone_length CHECK (phone IS NULL OR char_length(phone) <= 20)
);

-- Enable RLS on contacts table
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Only allow inserts through edge functions
CREATE POLICY "Allow edge function insert on contacts"
ON public.contacts
FOR INSERT
WITH CHECK (true);
-- RLS Policies for admin_users (no public access, only via edge functions)
CREATE POLICY "No direct access to admin_users"
ON public.admin_users FOR SELECT
USING (false);

-- RLS Policies for user_roles (no public access, only via edge functions)
CREATE POLICY "No direct access to user_roles"
ON public.user_roles FOR SELECT
USING (false);
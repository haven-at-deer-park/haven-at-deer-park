import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple hash function for password verification (in production, use bcrypt)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Generate a simple JWT-like token
function generateToken(adminId: string, email: string): string {
  const payload = {
    id: adminId,
    email: email,
    exp: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    iat: Date.now()
  };
  return btoa(JSON.stringify(payload));
}

// Verify token
function verifyToken(token: string): { valid: boolean; payload?: any } {
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp < Date.now()) {
      return { valid: false };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, email, password, token } = await req.json();
    console.log(`Admin auth action: ${action}`);

    if (action === 'login') {
      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: 'Email and password required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get admin user
      const { data: admin, error: adminError } = await supabase
        .from('admin_users')
        .select('id, email, password_hash')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (adminError || !admin) {
        console.log('Admin not found:', email);
        return new Response(
          JSON.stringify({ error: 'Invalid credentials' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify password
      const isValid = await verifyPassword(password, admin.password_hash);
      if (!isValid) {
        console.log('Invalid password for:', email);
        return new Response(
          JSON.stringify({ error: 'Invalid credentials' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if admin has admin role
      const { data: role, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', admin.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError || !role) {
        console.log('User does not have admin role:', email);
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update last login
      await supabase
        .from('admin_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', admin.id);

      // Generate token
      const authToken = generateToken(admin.id, admin.email);

      console.log('Admin login successful:', email);
      return new Response(
        JSON.stringify({ 
          success: true, 
          token: authToken,
          admin: { id: admin.id, email: admin.email }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify') {
      if (!token) {
        return new Response(
          JSON.stringify({ valid: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = verifyToken(token);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'change-password') {
      if (!token || !password) {
        return new Response(
          JSON.stringify({ error: 'Token and new password required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = verifyToken(token);
      if (!result.valid) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const newHash = await hashPassword(password);
      const { error } = await supabase
        .from('admin_users')
        .update({ password_hash: newHash })
        .eq('id', result.payload.id);

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to update password' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin auth error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
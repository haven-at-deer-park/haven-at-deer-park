import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

// Validation function
function validateContactForm(data: ContactFormData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Name validation
  if (!data.name || data.name.trim().length === 0) {
    errors.push("Name is required");
  } else if (data.name.length > 100) {
    errors.push("Name must be less than 100 characters");
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || data.email.trim().length === 0) {
    errors.push("Email is required");
  } else if (!emailRegex.test(data.email)) {
    errors.push("Invalid email format");
  } else if (data.email.length > 255) {
    errors.push("Email must be less than 255 characters");
  }
  
  // Phone validation (optional)
  if (data.phone && data.phone.length > 20) {
    errors.push("Phone number must be less than 20 characters");
  }
  
  // Subject validation
  if (!data.subject || data.subject.trim().length === 0) {
    errors.push("Subject is required");
  } else if (data.subject.length > 100) {
    errors.push("Subject must be less than 100 characters");
  }
  
  // Message validation
  if (!data.message || data.message.trim().length === 0) {
    errors.push("Message is required");
  } else if (data.message.length > 1000) {
    errors.push("Message must be less than 1000 characters");
  }
  
  return { valid: errors.length === 0, errors };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData: ContactFormData = await req.json();
    
    console.log("Contact form submission received");
    
    // Validate input
    const validation = validateContactForm(formData);
    if (!validation.valid) {
      console.error("Validation failed:", validation.errors);
      return new Response(
        JSON.stringify({ error: "Validation failed", details: validation.errors }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Sanitize and trim inputs
    const sanitizedData = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone?.trim() || null,
      subject: formData.subject.trim(),
      message: formData.message.trim(),
    };
    
    // Store contact form submission
    const { data, error } = await supabase
      .from('contacts')
      .insert([sanitizedData])
      .select()
      .single();
    
    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save contact form" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log("Contact form saved successfully:", data.id);
    
    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error("Error in contact-form function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
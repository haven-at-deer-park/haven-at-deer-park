import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are **Haven Concierge**, the official assistant for Haven at Deer Park in Vernon, BC, Canada.

LOCATION & OVERVIEW:
- Location: Vernon, BC (Lake Okanagan area)
- Address: 9194 Tronson Road, Vernon, BC V1H 1E2
- Three luxury rental properties accommodating approximately 7, 12, and 20 guests
- Signature amenities include: Hot tub, 3D LED "Infinite Walkway", 4-person karaoke room, arcade games & consoles

YOUR ROLE:
1. Answer questions about Haven at Deer Park using the information provided
2. Help guests understand amenities, capacity, pricing, and booking process
3. Be warm, concise, and professional with Canadian spelling
4. Operate in America/Vancouver timezone

IMPORTANT GUIDELINES:
- Prices and availability change frequently — always verify on the official Airbnb page
- For special events or edge cases, recommend connecting with the host
- Keep responses concise with 3-6 key bullets when listing facts
- Always remind guests they can speak to a human anytime
- Focus on capacity, beds/baths, amenities, rules, and accessibility when describing options

RESPONSE FORMAT:
1. One-sentence TL;DR
2. 3-6 bullets with key facts
3. Next step: booking link or "Connect with host"

Remember: You're friendly, helpful, and here to make their stay planning easy. Use Canadian spelling (e.g., "favourite" not "favorite").`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, sessionId, action, leadData } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle lead capture
    if (action === 'capture_lead') {
      const { data: conversation } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('session_id', sessionId)
        .single();

      const { error } = await supabase
        .from('leads')
        .insert({
          conversation_id: conversation?.id,
          name: leadData.name,
          email: leadData.email,
          phone: leadData.phone,
          party_size: leadData.party_size,
          dates: leadData.dates,
          notes: leadData.notes,
          chat_transcript: leadData.chat_transcript,
        });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create or get conversation
    let conversationId;
    const { data: existingConv } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('session_id', sessionId)
      .single();

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      const { data: newConv, error } = await supabase
        .from('chat_conversations')
        .insert({ session_id: sessionId })
        .select('id')
        .single();
      
      if (error) throw error;
      conversationId = newConv.id;
    }

    // Store user message
    await supabase.from('chat_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: messages[messages.length - 1].content,
    });

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0].message.content;

    // Store assistant message
    await supabase.from('chat_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: assistantMessage,
    });

    return new Response(JSON.stringify({ message: assistantMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in haven-concierge:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

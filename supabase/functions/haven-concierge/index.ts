import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { notifyLance } from "../_shared/twilio.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are Haven Concierge, the official assistant for Haven at Deer Park in Vernon, BC, Canada.

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
1. One short opening sentence
2. 3-6 bullet points using plain dashes (-)
3. A closing line with a next step

CRITICAL FORMATTING RULE:
You are responding inside a small chat bubble widget. NEVER use markdown formatting. No asterisks, no bold, no italic, no headers, no numbered sub-lists. Use only plain text, dashes (-) for bullet points, and line breaks. Keep it clean and readable.

Remember: You're friendly, helpful, and here to make their stay planning easy. Use Canadian spelling (e.g., "favourite" not "favorite").`;

const SAFE_MAX = 1500;

/**
 * Build a plain-text notification for Lance under SAFE_MAX characters.
 * Lead fields come first, conversation context fills remaining space,
 * footer is always included.
 */
function buildNotification(
  leadData: Record<string, unknown>,
  sessionId: string,
  leadId: string | null,
  contextExcerpt: string
): string {
  const name = leadData.name || 'Unknown';
  const phone = leadData.phone || 'Not provided';
  const preferredContact = leadData.preferredContact || 'Not specified';
  const inquiryType = leadData.inquiryType || 'General';
  const summary = leadData.summary || leadData.notes || 'No summary provided';
  const dates = leadData.dates || 'Not provided';
  const partySize = leadData.partySize || 'Not provided';

  const header = `New Haven Guest Inquiry\n\nName: ${name}\nPhone/WhatsApp: ${phone}\nPreferred Contact: ${preferredContact}\nInquiry Type: ${inquiryType}\nSummary: ${summary}\n\nDates: ${dates}\nParty Size: ${partySize}`;

  const footer = `\n\nSource: Haven Concierge\nSession ID: ${sessionId || 'unknown'}${leadId ? `\nLead ID: ${leadId}` : ''}\n\nFull transcript saved in Supabase.`;

  const contextLabel = '\n\nConversation Context:\n';

  // Calculate available space for conversation context
  const fixedLength = header.length + footer.length + contextLabel.length;
  const availableForContext = SAFE_MAX - fixedLength;

  if (availableForContext <= 0 || !contextExcerpt || contextExcerpt.trim().length === 0) {
    return header + footer;
  }

  // Trim context to fit, cut at sentence boundary
  let trimmedContext = contextExcerpt;
  if (trimmedContext.length > availableForContext) {
    trimmedContext = trimmedContext.substring(0, availableForContext);
    // Try to cut at last sentence-ending punctuation or newline
    const lastCleanBreak = Math.max(
      trimmedContext.lastIndexOf('\n'),
      trimmedContext.lastIndexOf('. '),
      trimmedContext.lastIndexOf('? '),
      trimmedContext.lastIndexOf('! ')
    );
    if (lastCleanBreak > availableForContext * 0.5) {
      trimmedContext = trimmedContext.substring(0, lastCleanBreak + 1);
    } else {
      // Fall back to last space to avoid mid-word cut
      const lastSpace = trimmedContext.lastIndexOf(' ');
      if (lastSpace > availableForContext * 0.5) {
        trimmedContext = trimmedContext.substring(0, lastSpace);
      }
    }
    trimmedContext = trimmedContext.trimEnd() + '...';
  }

  return header + contextLabel + trimmedContext + footer;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, sessionId, action, leadData, fullTranscript, contextExcerpt } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle lead capture (legacy path)
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

    // Handle human handoff — save lead, send notification to Lance
    if (action === 'capture_and_notify') {
      console.log('Lead capture submitted -- saving lead and notifying Lance...');

      // 1. Ensure conversation exists
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

      // 2. Build structured notes
      const preferredContact = leadData.preferredContact || 'Not specified';
      const inquiryType = leadData.inquiryType || 'General';
      const summary = leadData.summary || 'No summary provided';
      let notes = `Preferred Contact: ${preferredContact} | Inquiry Type: ${inquiryType} | Summary: ${summary}`;
      
      // If party size parsing failed but raw value exists, include it
      if (leadData.rawPartySize && !leadData.partySize) {
        notes += ` | Raw Party Size: ${leadData.rawPartySize}`;
      }

      // 3. Insert into leads table and get lead ID
      const parsedPartySize = leadData.partySize ? parseInt(leadData.partySize) : null;
      const { data: insertedLead, error: leadError } = await supabase
        .from('leads')
        .insert({
          conversation_id: conversationId,
          name: leadData.name,
          email: leadData.email || '',
          phone: leadData.phone,
          party_size: isNaN(parsedPartySize as number) ? null : parsedPartySize,
          dates: leadData.dates || null,
          notes: notes,
          chat_transcript: (fullTranscript || '').substring(0, 30000),
        })
        .select('id')
        .single();

      if (leadError) {
        console.error("Error saving lead to database:", leadError);
        throw leadError;
      }

      const leadId = insertedLead?.id || null;

      // 4. Build and send plain-text notification to Lance (non-blocking)
      let notifyChannel = 'none';
      try {
        const messageText = buildNotification(
          leadData,
          sessionId,
          leadId,
          contextExcerpt || ''
        );

        const preferredCh = (preferredContact || '').toLowerCase().includes('sms') ? 'sms' : 'whatsapp';
        const result = await notifyLance(messageText, preferredCh as 'whatsapp' | 'sms');
        notifyChannel = result.channel;
        console.log(`Concierge notification: ${result.channel}${result.error ? ` (${result.error})` : ''}`);
      } catch (notifyError) {
        // Non-blocking: notification failure should NOT fail the lead capture
        console.error("Error sending concierge notification:", notifyError);
      }

      return new Response(JSON.stringify({ success: true, channel: notifyChannel, leadId }), {
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

    // Call Google Gemini API directly
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

    // Convert OpenAI message format to Gemini format
    const geminiMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: geminiMessages,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Gemini API error:', aiResponse.status, errorText);
      throw new Error(`Gemini API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    
    // Fallback error handling if Gemini returns unexpected format
    if (!aiData.candidates || aiData.candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    const assistantMessage = aiData.candidates[0].content.parts[0].text;

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

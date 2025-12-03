import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, data } = await req.json();
    console.log(`Analytics action: ${action}`);

    if (action === 'session-start') {
      const { data: session, error } = await supabase
        .from('analytics_sessions')
        .insert({
          session_id: data.sessionId,
          entry_page: data.entryPage,
          device_type: data.deviceType,
          browser: data.browser,
          screen_width: data.screenWidth,
          screen_height: data.screenHeight,
          referrer: data.referrer,
          utm_source: data.utmSource,
          utm_medium: data.utmMedium,
          utm_campaign: data.utmCampaign,
          utm_term: data.utmTerm,
          utm_content: data.utmContent,
          is_repeat_visitor: data.isRepeatVisitor,
          visitor_id: data.visitorId
        })
        .select()
        .single();

      if (error) {
        console.error('Session start error:', error);
        throw error;
      }

      // Also record traffic source
      if (data.referrer || data.utmSource) {
        await supabase.from('analytics_traffic_sources').insert({
          session_id: data.sessionId,
          source: data.utmSource || 'direct',
          medium: data.utmMedium,
          campaign: data.utmCampaign,
          referrer_url: data.referrer,
          referrer_domain: data.referrer ? new URL(data.referrer).hostname : null
        });
      }

      return new Response(
        JSON.stringify({ success: true, session }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'session-end') {
      const { error } = await supabase
        .from('analytics_sessions')
        .update({
          ended_at: new Date().toISOString(),
          duration_seconds: data.duration,
          exit_page: data.exitPage,
          is_bounce: data.isBounce
        })
        .eq('session_id', data.sessionId);

      if (error) {
        console.error('Session end error:', error);
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'pageview') {
      const { error } = await supabase
        .from('analytics_pageviews')
        .insert({
          session_id: data.sessionId,
          page_path: data.pagePath,
          page_title: data.pageTitle,
          visitor_id: data.visitorId
        });

      if (error) {
        console.error('Pageview error:', error);
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update-pageview') {
      const { error } = await supabase
        .from('analytics_pageviews')
        .update({
          time_on_page_seconds: data.timeOnPage,
          scroll_depth_percent: data.scrollDepth
        })
        .eq('session_id', data.sessionId)
        .eq('page_path', data.pagePath)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Update pageview error:', error);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'event') {
      const { error } = await supabase
        .from('analytics_events')
        .insert({
          session_id: data.sessionId,
          event_type: data.eventType,
          event_category: data.eventCategory,
          event_action: data.eventAction,
          event_label: data.eventLabel,
          event_value: data.eventValue,
          page_path: data.pagePath,
          metadata: data.metadata || {},
          visitor_id: data.visitorId
        });

      if (error) {
        console.error('Event error:', error);
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'outbound-click') {
      const { error } = await supabase
        .from('analytics_outbound_clicks')
        .insert({
          session_id: data.sessionId,
          destination_url: data.destinationUrl,
          link_text: data.linkText,
          page_path: data.pagePath,
          button_id: data.buttonId,
          button_class: data.buttonClass,
          device_type: data.deviceType,
          utm_source: data.utmSource,
          utm_campaign: data.utmCampaign,
          visitor_id: data.visitorId
        });

      if (error) {
        console.error('Outbound click error:', error);
        throw error;
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
    console.error('Analytics error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
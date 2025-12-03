import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Verify admin token
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

    const { action, token, startDate, endDate, filters } = await req.json();
    
    // Verify admin token
    const tokenResult = verifyToken(token);
    if (!tokenResult.valid) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Dashboard action: ${action}, date range: ${startDate} to ${endDate}`);

    if (action === 'overview') {
      // Get total visitors (unique visitor_ids)
      const { data: sessions, error: sessionsError } = await supabase
        .from('analytics_sessions')
        .select('visitor_id, is_bounce, duration_seconds, is_repeat_visitor')
        .gte('started_at', startDate)
        .lte('started_at', endDate);

      if (sessionsError) throw sessionsError;

      const uniqueVisitors = new Set(sessions?.map(s => s.visitor_id) || []).size;
      const totalSessions = sessions?.length || 0;
      const bounces = sessions?.filter(s => s.is_bounce).length || 0;
      const bounceRate = totalSessions > 0 ? (bounces / totalSessions) * 100 : 0;
      const avgDuration = sessions?.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) / (totalSessions || 1);
      const repeatVisitors = sessions?.filter(s => s.is_repeat_visitor).length || 0;

      // Get total pageviews
      const { count: pageviewCount } = await supabase
        .from('analytics_pageviews')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', startDate)
        .lte('timestamp', endDate);

      // Get total Airbnb clicks
      const { count: airbnbClicks } = await supabase
        .from('analytics_outbound_clicks')
        .select('*', { count: 'exact', head: true })
        .ilike('destination_url', '%airbnb%')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate);

      return new Response(
        JSON.stringify({
          totalVisitors: totalSessions,
          uniqueVisitors,
          pageviews: pageviewCount || 0,
          bounceRate: bounceRate.toFixed(1),
          avgSessionDuration: Math.round(avgDuration),
          repeatVisitors,
          airbnbClicks: airbnbClicks || 0,
          conversionRate: totalSessions > 0 ? ((airbnbClicks || 0) / totalSessions * 100).toFixed(1) : '0'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'visitors-over-time') {
      const { data, error } = await supabase
        .from('analytics_sessions')
        .select('started_at')
        .gte('started_at', startDate)
        .lte('started_at', endDate)
        .order('started_at');

      if (error) throw error;

      // Group by date
      const grouped = (data || []).reduce((acc: Record<string, number>, session) => {
        const date = session.started_at.split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const chartData = Object.entries(grouped).map(([date, count]) => ({
        date,
        visitors: count
      }));

      return new Response(
        JSON.stringify(chartData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'traffic-sources') {
      const { data, error } = await supabase
        .from('analytics_traffic_sources')
        .select('source')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate);

      if (error) throw error;

      const grouped = (data || []).reduce((acc: Record<string, number>, item) => {
        const source = item.source || 'direct';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {});

      const chartData = Object.entries(grouped).map(([source, count]) => ({
        source,
        count
      }));

      return new Response(
        JSON.stringify(chartData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'top-pages') {
      const { data, error } = await supabase
        .from('analytics_pageviews')
        .select('page_path')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate);

      if (error) throw error;

      const grouped = (data || []).reduce((acc: Record<string, number>, item) => {
        acc[item.page_path] = (acc[item.page_path] || 0) + 1;
        return acc;
      }, {});

      const chartData = Object.entries(grouped)
        .map(([page, views]) => ({ page, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      return new Response(
        JSON.stringify(chartData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'device-breakdown') {
      const { data, error } = await supabase
        .from('analytics_sessions')
        .select('device_type')
        .gte('started_at', startDate)
        .lte('started_at', endDate);

      if (error) throw error;

      const grouped = (data || []).reduce((acc: Record<string, number>, item) => {
        const device = item.device_type || 'unknown';
        acc[device] = (acc[device] || 0) + 1;
        return acc;
      }, {});

      const chartData = Object.entries(grouped).map(([device, count]) => ({
        device,
        count
      }));

      return new Response(
        JSON.stringify(chartData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'airbnb-clicks-over-time') {
      const { data, error } = await supabase
        .from('analytics_outbound_clicks')
        .select('timestamp')
        .ilike('destination_url', '%airbnb%')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .order('timestamp');

      if (error) throw error;

      const grouped = (data || []).reduce((acc: Record<string, number>, item) => {
        const date = item.timestamp.split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const chartData = Object.entries(grouped).map(([date, clicks]) => ({
        date,
        clicks
      }));

      return new Response(
        JSON.stringify(chartData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'airbnb-clicks-by-source') {
      const { data, error } = await supabase
        .from('analytics_outbound_clicks')
        .select('utm_source')
        .ilike('destination_url', '%airbnb%')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate);

      if (error) throw error;

      const grouped = (data || []).reduce((acc: Record<string, number>, item) => {
        const source = item.utm_source || 'direct';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {});

      const chartData = Object.entries(grouped)
        .map(([source, clicks]) => ({ source, clicks }))
        .sort((a, b) => b.clicks - a.clicks);

      return new Response(
        JSON.stringify(chartData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'airbnb-clicks-by-page') {
      const { data, error } = await supabase
        .from('analytics_outbound_clicks')
        .select('page_path')
        .ilike('destination_url', '%airbnb%')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate);

      if (error) throw error;

      const grouped = (data || []).reduce((acc: Record<string, number>, item) => {
        acc[item.page_path] = (acc[item.page_path] || 0) + 1;
        return acc;
      }, {});

      const chartData = Object.entries(grouped)
        .map(([page, clicks]) => ({ page, clicks }))
        .sort((a, b) => b.clicks - a.clicks);

      return new Response(
        JSON.stringify(chartData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'airbnb-clicks-by-device') {
      const { data, error } = await supabase
        .from('analytics_outbound_clicks')
        .select('device_type')
        .ilike('destination_url', '%airbnb%')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate);

      if (error) throw error;

      const grouped = (data || []).reduce((acc: Record<string, number>, item) => {
        const device = item.device_type || 'unknown';
        acc[device] = (acc[device] || 0) + 1;
        return acc;
      }, {});

      const chartData = Object.entries(grouped).map(([device, clicks]) => ({
        device,
        clicks
      }));

      return new Response(
        JSON.stringify(chartData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'funnel') {
      // Get total visitors
      const { count: totalVisitors } = await supabase
        .from('analytics_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('started_at', startDate)
        .lte('started_at', endDate);

      // Get engaged visitors (more than 1 pageview or scroll > 50%)
      const { data: pageviews } = await supabase
        .from('analytics_pageviews')
        .select('session_id, scroll_depth_percent')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate);

      const sessionPageviews = (pageviews || []).reduce((acc: Record<string, number>, pv) => {
        acc[pv.session_id] = (acc[pv.session_id] || 0) + 1;
        return acc;
      }, {});

      const engagedSessions = Object.entries(sessionPageviews).filter(([_, count]) => count > 1).length;

      // Get Airbnb clicks
      const { count: airbnbClicks } = await supabase
        .from('analytics_outbound_clicks')
        .select('*', { count: 'exact', head: true })
        .ilike('destination_url', '%airbnb%')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate);

      return new Response(
        JSON.stringify({
          visitors: totalVisitors || 0,
          engaged: engagedSessions,
          clicks: airbnbClicks || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Dashboard error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
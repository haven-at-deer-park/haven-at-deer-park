import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { action, token, startDate, endDate } = await req.json();
    
    const tokenResult = verifyToken(token);
    if (!tokenResult.valid) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Dashboard action: ${action}, date range: ${startDate} to ${endDate}`);

    if (action === 'overview') {
      // Get all sessions in date range
      const { data: sessions } = await supabase
        .from('analytics_sessions')
        .select('visitor_id, session_id, is_bounce, duration_seconds, is_repeat_visitor, started_at, ended_at, device_type, browser')
        .gte('started_at', startDate)
        .lte('started_at', endDate + 'T23:59:59.999Z');

      // Filter out likely bots (sessions with no device_type or unknown browser patterns)
      const validSessions = (sessions || []).filter(s => s.device_type && s.browser !== 'Unknown');
      
      // Calculate unique visitors (by visitor_id, not session count)
      const uniqueVisitors = new Set(validSessions.map(s => s.visitor_id).filter(Boolean)).size;
      const totalSessions = validSessions.length;
      const bounces = validSessions.filter(s => s.is_bounce).length;
      const bounceRate = totalSessions > 0 ? (bounces / totalSessions) * 100 : 0;
      
      // Calculate avg duration from ended_at - started_at
      let totalDuration = 0;
      let sessionsWithDuration = 0;
      for (const s of validSessions) {
        if (s.started_at && s.ended_at) {
          const duration = (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000;
          // Exclude unrealistic durations (> 2 hours)
          if (duration > 0 && duration < 7200) {
            totalDuration += duration;
            sessionsWithDuration++;
          }
        }
      }
      const avgDuration = sessionsWithDuration > 0 ? totalDuration / sessionsWithDuration : 0;
      const repeatVisitors = validSessions.filter(s => s.is_repeat_visitor).length;

      // Get pageviews count
      const { data: pageviews } = await supabase
        .from('analytics_pageviews')
        .select('id')
        .gte('viewed_at', startDate)
        .lte('viewed_at', endDate + 'T23:59:59.999Z');
      
      const pageviewCount = pageviews?.length || 0;

      // Get Airbnb clicks and unique clickers
      const { data: clicks } = await supabase
        .from('analytics_outbound_clicks')
        .select('session_id, visitor_id')
        .ilike('destination_url', '%airbnb%')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate + 'T23:59:59.999Z');

      const airbnbClicks = clicks?.length || 0;
      const uniqueClickers = new Set(clicks?.map(c => c.session_id).filter(Boolean) || []).size;
      const ctr = totalSessions > 0 ? (uniqueClickers / totalSessions) * 100 : 0;

      console.log('Overview data:', { 
        totalSessions, 
        uniqueVisitors, 
        pageviewCount, 
        airbnbClicks,
        dateRange: { startDate, endDate }
      });

      return new Response(
        JSON.stringify({
          totalVisitors: totalSessions,
          uniqueVisitors,
          pageviews: pageviewCount,
          bounceRate: bounceRate.toFixed(1),
          avgSessionDuration: Math.round(avgDuration),
          repeatVisitors,
          airbnbClicks,
          uniqueClickers,
          conversionRate: ctr.toFixed(1)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'airbnb-clicks-by-location') {
      const endDateFull = endDate + 'T23:59:59.999Z';
      const { data } = await supabase
        .from('analytics_outbound_clicks')
        .select('button_id, session_id')
        .ilike('destination_url', '%airbnb%')
        .gte('timestamp', startDate)
        .lte('timestamp', endDateFull);

      const { data: sessions } = await supabase
        .from('analytics_sessions')
        .select('session_id, device_type, browser')
        .gte('started_at', startDate)
        .lte('started_at', endDateFull);
      
      // Filter valid sessions
      const validSessions = (sessions || []).filter(s => s.device_type && s.browser !== 'Unknown');
      const totalSessions = validSessions.length || 1;

      const grouped = (data || []).reduce((acc: Record<string, { clicks: number; sessions: Set<string> }>, item) => {
        const location = item.button_id || 'unknown';
        if (!acc[location]) acc[location] = { clicks: 0, sessions: new Set() };
        acc[location].clicks++;
        if (item.session_id) acc[location].sessions.add(item.session_id);
        return acc;
      }, {});

      const chartData = Object.entries(grouped).map(([location, data]) => ({
        location,
        clicks: data.clicks,
        uniqueClickers: data.sessions.size,
        ctr: ((data.sessions.size / totalSessions) * 100).toFixed(1)
      })).sort((a, b) => b.clicks - a.clicks);

      return new Response(JSON.stringify(chartData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'airbnb-clicks-by-suite') {
      const endDateFull = endDate + 'T23:59:59.999Z';
      const { data } = await supabase
        .from('analytics_outbound_clicks')
        .select('button_class')
        .ilike('destination_url', '%airbnb%')
        .gte('timestamp', startDate)
        .lte('timestamp', endDateFull);

      const grouped = (data || []).reduce((acc: Record<string, number>, item) => {
        const suite = item.button_class || 'unknown';
        acc[suite] = (acc[suite] || 0) + 1;
        return acc;
      }, {});

      const chartData = Object.entries(grouped).map(([suite, clicks]) => ({ suite, clicks })).sort((a, b) => b.clicks - a.clicks);
      return new Response(JSON.stringify(chartData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'visitors-over-time') {
      const endDateFull = endDate + 'T23:59:59.999Z';
      const { data } = await supabase
        .from('analytics_sessions')
        .select('started_at, device_type, browser')
        .gte('started_at', startDate)
        .lte('started_at', endDateFull)
        .order('started_at');
      
      // Filter valid sessions
      const validSessions = (data || []).filter(s => s.device_type && s.browser !== 'Unknown');
      
      const grouped = validSessions.reduce((acc: Record<string, number>, session) => { 
        const date = session.started_at.split('T')[0]; 
        acc[date] = (acc[date] || 0) + 1; 
        return acc; 
      }, {});
      return new Response(JSON.stringify(Object.entries(grouped).map(([date, count]) => ({ date, visitors: count }))), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'traffic-sources') {
      const endDateFull = endDate + 'T23:59:59.999Z';
      const { data } = await supabase
        .from('analytics_sessions')
        .select('utm_source, referrer, device_type, browser')
        .gte('started_at', startDate)
        .lte('started_at', endDateFull);
      
      // Filter valid sessions
      const validSessions = (data || []).filter(s => s.device_type && s.browser !== 'Unknown');
      
      const grouped = validSessions.reduce((acc: Record<string, number>, item) => { 
        let source = 'direct';
        if (item.utm_source) {
          source = item.utm_source;
        } else if (item.referrer) {
          try {
            source = new URL(item.referrer).hostname;
          } catch {
            source = 'direct';
          }
        }
        acc[source] = (acc[source] || 0) + 1; 
        return acc; 
      }, {});
      return new Response(JSON.stringify(Object.entries(grouped).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count)), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'top-pages') {
      const endDateFull = endDate + 'T23:59:59.999Z';
      const { data } = await supabase
        .from('analytics_pageviews')
        .select('path')
        .gte('viewed_at', startDate)
        .lte('viewed_at', endDateFull);
      
      const grouped = (data || []).reduce((acc: Record<string, number>, item) => { 
        acc[item.path] = (acc[item.path] || 0) + 1; 
        return acc; 
      }, {});
      return new Response(JSON.stringify(Object.entries(grouped).map(([page, views]) => ({ page, views })).sort((a, b) => b.views - a.views).slice(0, 10)), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'device-breakdown') {
      const endDateFull = endDate + 'T23:59:59.999Z';
      const { data } = await supabase
        .from('analytics_sessions')
        .select('device_type, browser')
        .gte('started_at', startDate)
        .lte('started_at', endDateFull);
      
      // Filter valid sessions
      const validSessions = (data || []).filter(s => s.device_type && s.browser !== 'Unknown');
      
      const grouped = validSessions.reduce((acc: Record<string, number>, item) => { 
        const device = item.device_type || 'unknown'; 
        acc[device] = (acc[device] || 0) + 1; 
        return acc; 
      }, {});
      return new Response(JSON.stringify(Object.entries(grouped).map(([device, count]) => ({ device, count }))), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'airbnb-clicks-over-time') {
      const endDateFull = endDate + 'T23:59:59.999Z';
      const { data } = await supabase
        .from('analytics_outbound_clicks')
        .select('timestamp')
        .ilike('destination_url', '%airbnb%')
        .gte('timestamp', startDate)
        .lte('timestamp', endDateFull)
        .order('timestamp');
      
      const grouped = (data || []).reduce((acc: Record<string, number>, item) => { 
        const date = item.timestamp.split('T')[0]; 
        acc[date] = (acc[date] || 0) + 1; 
        return acc; 
      }, {});
      return new Response(JSON.stringify(Object.entries(grouped).map(([date, clicks]) => ({ date, clicks }))), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'airbnb-clicks-by-source') {
      const endDateFull = endDate + 'T23:59:59.999Z';
      const { data } = await supabase
        .from('analytics_outbound_clicks')
        .select('utm_source')
        .ilike('destination_url', '%airbnb%')
        .gte('timestamp', startDate)
        .lte('timestamp', endDateFull);
      
      const grouped = (data || []).reduce((acc: Record<string, number>, item) => { 
        const source = item.utm_source || 'direct'; 
        acc[source] = (acc[source] || 0) + 1; 
        return acc; 
      }, {});
      return new Response(JSON.stringify(Object.entries(grouped).map(([source, clicks]) => ({ source, clicks })).sort((a, b) => b.clicks - a.clicks)), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'airbnb-clicks-by-page') {
      const endDateFull = endDate + 'T23:59:59.999Z';
      const { data } = await supabase
        .from('analytics_outbound_clicks')
        .select('page_path')
        .ilike('destination_url', '%airbnb%')
        .gte('timestamp', startDate)
        .lte('timestamp', endDateFull);
      
      const grouped = (data || []).reduce((acc: Record<string, number>, item) => { 
        acc[item.page_path] = (acc[item.page_path] || 0) + 1; 
        return acc; 
      }, {});
      return new Response(JSON.stringify(Object.entries(grouped).map(([page, clicks]) => ({ page, clicks })).sort((a, b) => b.clicks - a.clicks)), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'airbnb-clicks-by-device') {
      const endDateFull = endDate + 'T23:59:59.999Z';
      const { data } = await supabase
        .from('analytics_outbound_clicks')
        .select('device_type')
        .ilike('destination_url', '%airbnb%')
        .gte('timestamp', startDate)
        .lte('timestamp', endDateFull);
      
      const grouped = (data || []).reduce((acc: Record<string, number>, item) => { 
        const device = item.device_type || 'unknown'; 
        acc[device] = (acc[device] || 0) + 1; 
        return acc; 
      }, {});
      return new Response(JSON.stringify(Object.entries(grouped).map(([device, clicks]) => ({ device, clicks }))), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }


    if (action === 'funnel') {
      const { count: totalVisitors } = await supabase.from('analytics_sessions').select('*', { count: 'exact', head: true }).gte('started_at', startDate).lte('started_at', endDate);
      const { data: pageviews } = await supabase.from('analytics_pageviews').select('session_id').gte('viewed_at', startDate).lte('viewed_at', endDate);
      const sessionPageviews = (pageviews || []).reduce((acc: Record<string, number>, pv) => { acc[pv.session_id] = (acc[pv.session_id] || 0) + 1; return acc; }, {});
      const engagedSessions = Object.entries(sessionPageviews).filter(([_, count]) => count > 1).length;
      const { data: clicks } = await supabase.from('analytics_outbound_clicks').select('session_id').ilike('destination_url', '%airbnb%').gte('timestamp', startDate).lte('timestamp', endDate);
      const uniqueClickers = new Set(clicks?.map(c => c.session_id) || []).size;
      return new Response(JSON.stringify({ visitors: totalVisitors || 0, engaged: engagedSessions, clicks: uniqueClickers }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Dashboard error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startDate, endDate, apiKey } = await req.json();
    
    const expectedApiKey = Deno.env.get("ANALYTICS_API_KEY");
    if (apiKey !== expectedApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Fetching analytics from ${startDate} to ${endDate}`);

    // Get sessions for unique visitors count
    const { data: sessions } = await supabase
      .from("analytics_sessions")
      .select("visitor_id, session_id, started_at, ended_at")
      .gte("started_at", startDate)
      .lte("started_at", endDate);

    // Get pageviews from analytics_pageviews table (has time_on_page_ms)
    const { data: pageviews } = await supabase
      .from("analytics_pageviews")
      .select("*")
      .gte("viewed_at", startDate)
      .lte("viewed_at", endDate);

    // Also check analytics_events for page_view events
    const { data: events } = await supabase
      .from("analytics_events")
      .select("*")
      .eq("event_type", "page_view")
      .gte("timestamp", startDate)
      .lte("timestamp", endDate);

    // Combine pageviews from both tables
    const allPageViews = [
      ...(pageviews || []).map(p => ({ visitor_id: p.visitor_id, timestamp: p.viewed_at, time_on_page: p.time_on_page_ms })),
      ...(events || []).map(e => ({ visitor_id: e.visitor_id, timestamp: e.timestamp, time_on_page: null }))
    ];

    // Unique visitors from sessions or pageviews
    const uniqueVisitorIds = new Set([
      ...(sessions || []).map(s => s.visitor_id),
      ...allPageViews.map(p => p.visitor_id)
    ].filter(Boolean));

    const uniqueVisitors = uniqueVisitorIds.size;
    const totalPageViews = allPageViews.length;

    // Group by visitor OR session_id (fallback) for bounce rate calculation
    const visitorPageCounts: Record<string, number> = {};
    const visitorEvents: Record<string, any[]> = {};
    
    for (const pv of allPageViews) {
      const visitorId = pv.visitor_id || pv.session_id;
      if (visitorId) {
        visitorPageCounts[visitorId] = (visitorPageCounts[visitorId] || 0) + 1;
        if (!visitorEvents[visitorId]) {
          visitorEvents[visitorId] = [];
        }
        visitorEvents[visitorId].push(pv);
      }
    }

    // Bounce = visitors with only 1 pageview
    const bounces = Object.values(visitorPageCounts).filter(count => count === 1).length;
    const bounceRate = uniqueVisitors > 0 ? (bounces / uniqueVisitors) * 100 : 0;

    // Calculate duration from event timestamps per visitor/session
    let totalDuration = 0;
    let sessionsWithDuration = 0;
    const visitorIds = Object.keys(visitorEvents);
    
    console.log(`Processing ${visitorIds.length} unique visitors/sessions`);

    for (const visitorId of visitorIds) {
      const events = visitorEvents[visitorId];
      
      // Get timestamps from multiple possible field names
      const timestamps = events
        .map((e: any) => {
          const ts = e.created_at || e.viewed_at || e.timestamp;
          if (!ts) return null;
          const time = new Date(ts).getTime();
          return isNaN(time) ? null : time;
        })
        .filter((t): t is number => t !== null)
        .sort((a, b) => a - b);

      // Only calculate duration when there are at least 2 valid timestamps
      if (timestamps.length >= 2) {
        const duration = (timestamps[timestamps.length - 1] - timestamps[0]) / 1000;
        if (duration > 0 && duration < 7200) {
          totalDuration += duration;
          sessionsWithDuration++;
        }
      }
    }

    console.log(`Duration calculation: ${sessionsWithDuration} sessions with duration, total: ${totalDuration}s`);

    // Average duration: prefer calculated from events, fallback to sessions table
    let avgDuration = 0;
    if (sessionsWithDuration > 0) {
      avgDuration = totalDuration / sessionsWithDuration;
    } else {
      // Fallback: try sessions table with started_at/ended_at
      const sessionsWithTimes = (sessions || []).filter(s => s.started_at && s.ended_at);
      if (sessionsWithTimes.length > 0) {
        const sessionTotal = sessionsWithTimes.reduce((sum, s) => {
          const duration = (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000;
          return sum + (duration > 0 && duration < 7200 ? duration : 0);
        }, 0);
        avgDuration = sessionTotal / sessionsWithTimes.length;
      } else {
        // Final fallback: use time_on_page_ms from pageviews
        const timeOnPages = allPageViews.filter(p => p.time_on_page && p.time_on_page > 0);
        if (timeOnPages.length > 0) {
          avgDuration = timeOnPages.reduce((sum, p) => sum + (p.time_on_page / 1000), 0) / timeOnPages.length;
        }
      }
    }

    const pagesPerVisit = uniqueVisitors > 0 ? totalPageViews / uniqueVisitors : 0;

    console.log(`Analytics: ${uniqueVisitors} visitors, ${totalPageViews} pageviews, ${avgDuration.toFixed(1)}s avg, ${bounceRate.toFixed(1)}% bounce`);

    return new Response(
      JSON.stringify({
        analytics: {
          visitors: uniqueVisitors,
          pageViews: totalPageViews,
          avgDuration,
          bounceRate,
          pagesPerVisit,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

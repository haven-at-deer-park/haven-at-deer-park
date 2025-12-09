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

    // Group by visitor for bounce rate calculation
    const visitorPageCounts: Record<string, number> = {};
    for (const pv of allPageViews) {
      if (pv.visitor_id) {
        visitorPageCounts[pv.visitor_id] = (visitorPageCounts[pv.visitor_id] || 0) + 1;
      }
    }

    // Bounce = visitors with only 1 pageview
    const bounces = Object.values(visitorPageCounts).filter(count => count === 1).length;
    const bounceRate = uniqueVisitors > 0 ? (bounces / uniqueVisitors) * 100 : 0;

    // Average duration from sessions or time_on_page
    let avgDuration = 0;
    const sessionsWithDuration = (sessions || []).filter(s => s.started_at && s.ended_at);
    
    if (sessionsWithDuration.length > 0) {
      const totalDuration = sessionsWithDuration.reduce((sum, s) => {
        const duration = (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000;
        return sum + (duration > 0 && duration < 7200 ? duration : 0);
      }, 0);
      avgDuration = totalDuration / sessionsWithDuration.length;
    } else {
      // Fallback: use time_on_page_ms from pageviews
      const timeOnPages = allPageViews.filter(p => p.time_on_page && p.time_on_page > 0);
      if (timeOnPages.length > 0) {
        avgDuration = timeOnPages.reduce((sum, p) => sum + (p.time_on_page / 1000), 0) / timeOnPages.length;
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

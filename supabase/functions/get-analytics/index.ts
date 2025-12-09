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
    console.log('Received request:', { startDate, endDate, hasApiKey: !!apiKey });
    
    const expectedApiKey = Deno.env.get("ANALYTICS_API_KEY");
    if (apiKey !== expectedApiKey) {
      console.error('API key validation failed');
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all page_view events in date range
    const { data: events, error: eventsError } = await supabase
      .from("analytics_events")
      .select("*")
      .eq("event_type", "page_view")
      .gte("timestamp", startDate)
      .lte("timestamp", endDate);

    if (eventsError) {
      console.error('Events query error:', eventsError);
      throw eventsError;
    }

    console.log('Events found:', events?.length || 0);

    // Group by visitor_id
    const visitorEvents: Record<string, any[]> = {};
    for (const event of events || []) {
      if (!visitorEvents[event.visitor_id]) {
        visitorEvents[event.visitor_id] = [];
      }
      visitorEvents[event.visitor_id].push(event);
    }

    const visitorIds = Object.keys(visitorEvents);
    const uniqueVisitors = visitorIds.length;
    const pageViews = events?.length || 0;

    // Calculate bounce rate and avg duration
    let bounces = 0;
    let totalDuration = 0;
    let sessionsWithDuration = 0;

    for (const visitorId of visitorIds) {
      const visitorPageViews = visitorEvents[visitorId];
      
      if (visitorPageViews.length === 1) {
        bounces++;
      }

      if (visitorPageViews.length > 1) {
        const timestamps = visitorPageViews
          .map(e => new Date(e.timestamp).getTime())
          .sort((a, b) => a - b);
        
        const duration = (timestamps[timestamps.length - 1] - timestamps[0]) / 1000;
        if (duration > 0 && duration < 7200) {
          totalDuration += duration;
          sessionsWithDuration++;
        }
      }
    }

    const avgDuration = sessionsWithDuration > 0 ? Math.round(totalDuration / sessionsWithDuration) : 0;
    const bounceRate = uniqueVisitors > 0 ? Math.round((bounces / uniqueVisitors) * 1000) / 10 : 0;
    const pagesPerVisit = uniqueVisitors > 0 ? Math.round((pageViews / uniqueVisitors) * 100) / 100 : 0;

    const analytics = {
      visitors: uniqueVisitors,
      pageViews,
      avgDuration,
      bounceRate,
      pagesPerVisit,
    };

    console.log('Returning analytics:', analytics);

    return new Response(
      JSON.stringify({ analytics }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

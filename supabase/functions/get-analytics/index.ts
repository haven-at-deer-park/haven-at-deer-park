import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get("x-api-key");
    const expectedApiKey = Deno.env.get("ANALYTICS_API_KEY");

    if (!apiKey || apiKey !== expectedApiKey) {
      console.error("[get-analytics] Invalid or missing API key");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { startDate, endDate } = await req.json();

    if (!startDate || !endDate) {
      return new Response(
        JSON.stringify({ success: false, error: "startDate and endDate are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[get-analytics] Fetching analytics from ${startDate} to ${endDate}`);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from("analytics_sessions")
      .select("*")
      .gte("started_at", startDate)
      .lte("started_at", endDate);

    if (sessionsError) {
      console.error("[get-analytics] Sessions error:", sessionsError);
      throw sessionsError;
    }

    // Fetch page views
    const { data: pageViews, error: pageViewsError } = await supabase
      .from("analytics_pageviews")
      .select("*")
      .gte("viewed_at", startDate)
      .lte("viewed_at", endDate);

    if (pageViewsError) {
      console.error("[get-analytics] Page views error:", pageViewsError);
      throw pageViewsError;
    }

    // Calculate metrics
    const totalSessions = sessions?.length || 0;
    const uniqueVisitors = new Set(sessions?.map(s => s.visitor_id)).size;
    const totalPageViews = pageViews?.length || 0;

    // Bounce rate
    const bouncedSessions = sessions?.filter(s => s.is_bounce === true).length || 0;
    const bounceRate = totalSessions > 0 
      ? Math.round((bouncedSessions / totalSessions) * 1000) / 10 
      : 0;

    // Average duration (from sessions with ended_at)
    const sessionsWithDuration = sessions?.filter(s => s.started_at && s.ended_at) || [];
    let avgDuration = 0;
    if (sessionsWithDuration.length > 0) {
      const totalDuration = sessionsWithDuration.reduce((sum, s) => {
        const start = new Date(s.started_at).getTime();
        const end = new Date(s.ended_at).getTime();
        return sum + (end - start) / 1000;
      }, 0);
      avgDuration = Math.round(totalDuration / sessionsWithDuration.length);
    }

    // Pages per visit
    const pagesPerVisit = totalSessions > 0 
      ? Math.round((totalPageViews / totalSessions) * 10) / 10 
      : 0;

    const data = {
      visitors: uniqueVisitors,
      pageViews: totalPageViews,
      avgDuration,
      bounceRate,
      pagesPerVisit,
      totalSessions,
    };

    console.log("[get-analytics] Response:", data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[get-analytics] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

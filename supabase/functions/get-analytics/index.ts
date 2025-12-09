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
    const { startDate, endDate, apiKey } = await req.json();
    console.log('Received request:', { startDate, endDate, hasApiKey: !!apiKey });

    const expectedKey = Deno.env.get('ANALYTICS_API_KEY');
    console.log('Expected key exists:', !!expectedKey);
    console.log('Keys match:', apiKey === expectedKey);

    if (!apiKey || apiKey !== expectedKey) {
      console.error('API key validation failed');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: events, error: eventsError } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('event_type', 'page_view')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate);

    if (eventsError) {
      console.error('Events query error:', eventsError);
      throw eventsError;
    }

    console.log('Events found:', events?.length || 0);

    const uniqueVisitors = new Set(events?.map(e => e.visitor_id) || []).size;
    const pageViews = events?.length || 0;

    // Calculate avg duration per visitor
    const visitorEvents: Record<string, Date[]> = {};
    events?.forEach(e => {
      if (!visitorEvents[e.visitor_id]) visitorEvents[e.visitor_id] = [];
      visitorEvents[e.visitor_id].push(new Date(e.timestamp));
    });

    let totalDuration = 0;
    let visitorsWithDuration = 0;
    Object.values(visitorEvents).forEach(timestamps => {
      if (timestamps.length > 1) {
        timestamps.sort((a, b) => a.getTime() - b.getTime());
        const duration = (timestamps[timestamps.length - 1].getTime() - timestamps[0].getTime()) / 1000;
        totalDuration += duration;
        visitorsWithDuration++;
      }
    });
    const avgDuration = visitorsWithDuration > 0 ? Math.round(totalDuration / visitorsWithDuration) : 0;

    // Bounce rate: visitors with only 1 page view
    const bouncedVisitors = Object.values(visitorEvents).filter(t => t.length === 1).length;
    const bounceRate = uniqueVisitors > 0 ? Math.round((bouncedVisitors / uniqueVisitors) * 1000) / 10 : 0;

    const pagesPerVisit = uniqueVisitors > 0 ? Math.round((pageViews / uniqueVisitors) * 100) / 100 : 0;

    const analytics = {
      visitors: uniqueVisitors,
      pageViews,
      avgDuration,
      bounceRate,
      pagesPerVisit
    };

    console.log('Returning analytics:', analytics);

    return new Response(
      JSON.stringify({ analytics }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

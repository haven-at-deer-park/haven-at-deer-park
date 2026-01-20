import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

const normalizeDateRange = (startDate: string, endDate: string) => {
  const startISO = new Date(`${startDate}T00:00:00.000Z`).toISOString();
  const endExclusive = new Date(`${endDate}T00:00:00.000Z`);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  return { startISO, endISO: endExclusive.toISOString() };
};

const safeUrlHostname = (referrer: string) => {
  try { return new URL(referrer).hostname.replace(/^www\./, ""); }
  catch { return ""; }
};

const detectDevice = (deviceTypeRaw: string, uaRaw: string) => {
  const device = (deviceTypeRaw || "").toLowerCase();
  const ua = (uaRaw || "").toLowerCase();
  if (device) {
    if (device.includes("mobile") || device.includes("phone")) return "Mobile";
    if (device.includes("tablet") || device.includes("ipad")) return "Tablet";
    return "Desktop";
  }
  if (/tablet|ipad/i.test(ua)) return "Tablet";
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) return "Mobile";
  return "Desktop";
};

const categorizeTraffic = (utmMedium: string, utmSource: string, referrer: string) => {
  const medium = (utmMedium || "").toLowerCase();
  const source = (utmSource || "").toLowerCase();
  const hostname = referrer ? safeUrlHostname(referrer) : "";

  const searchHostnames = ["google.com", "bing.com", "yahoo.com", "duckduckgo.com", "baidu.com", "yandex.com"];
  const socialHostnames = ["facebook.com", "m.facebook.com", "l.facebook.com", "instagram.com", "l.instagram.com", "twitter.com", "t.co", "linkedin.com", "tiktok.com", "youtube.com", "pinterest.com", "reddit.com"];

  if (["cpc", "ppc", "paid", "paid_social", "display"].includes(medium)) return "Paid";
  if (medium === "email" || source.includes("mail") || hostname.includes("mail")) return "Email";
  if (!source && !hostname) return "Direct";
  if (searchHostnames.some((se) => source.includes(se.split(".")[0]) || source.includes(se))) return "Organic";
  if (socialHostnames.some((sp) => source.includes(sp.split(".")[0]) || source.includes(sp))) return "Social";
  if (hostname) {
    if (searchHostnames.includes(hostname)) return "Organic";
    if (socialHostnames.includes(hostname)) return "Social";
    return "Referral";
  }
  return "Referral";
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { startDate, endDate } = body;

    const providedKey = req.headers.get("x-api-key") || req.headers.get("apikey") || body.apiKey || body.api_key;
    const expectedKey = Deno.env.get("ANALYTICS_API_KEY");
    if (!expectedKey || providedKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!startDate || !endDate) {
      return new Response(JSON.stringify({ error: "Missing startDate/endDate" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { startISO, endISO } = normalizeDateRange(startDate, endDate);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: sessions } = await supabase.from("analytics_sessions").select("*").gte("started_at", startISO).lt("started_at", endISO);

    let pageViews: any[] = [];
    const { data: pv } = await supabase.from("analytics_page_views").select("*").gte("viewed_at", startISO).lt("viewed_at", endISO);
    if (pv?.length) {
      pageViews = pv;
    } else {
      const { data: events } = await supabase.from("analytics_events").select("*").in("event_type", ["page_view", "pageview"]).gte("created_at", startISO).lt("created_at", endISO);
      pageViews = events || [];
    }

    const sessionList = sessions || [];
    const pageViewList = pageViews || [];

    const visitorSet = new Set<string>();
    sessionList.forEach((s: any) => s?.visitor_id && visitorSet.add(String(s.visitor_id)));
    pageViewList.forEach((p: any) => p?.visitor_id && visitorSet.add(String(p.visitor_id)));

    const visitors = visitorSet.size;
    const totalSessions = sessionList.length || visitors;
    const pageViewsCount = pageViewList.length;

    const bounceSessions = sessionList.filter((s: any) => s?.bounce || s?.page_count === 1).length;
    const bounceRate = totalSessions > 0 ? (bounceSessions / totalSessions) * 100 : 0;

    let totalDuration = 0, durationCount = 0;
    sessionList.forEach((s: any) => {
      if (s?.started_at && s?.ended_at) {
        const dur = (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000;
        if (dur > 0 && dur < 7200) { totalDuration += dur; durationCount += 1; }
      }
    });
    const avgDuration = durationCount > 0 ? totalDuration / durationCount : 0;
    const pagesPerVisit = visitors > 0 ? pageViewsCount / visitors : 0;

    const attributionRows = sessionList.length ? sessionList : pageViewList;
    const trafficCounts: Record<string, number> = {};
    const deviceCounts: Record<string, number> = { Desktop: 0, Mobile: 0, Tablet: 0 };

    attributionRows.forEach((row: any) => {
      const source = categorizeTraffic(row?.utm_medium, row?.utm_source, row?.referrer);
      trafficCounts[source] = (trafficCounts[source] || 0) + 1;
      const device = detectDevice(row?.device_type || row?.device || "", row?.user_agent || row?.ua || "");
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    });

    const trafficSources = Object.entries(trafficCounts).map(([source, sessions]) => ({
      source, sessions, percentage: totalSessions > 0 ? Math.round((sessions / totalSessions) * 1000) / 10 : 0,
    })).sort((a, b) => b.sessions - a.sessions);

    const deviceBreakdown = Object.entries(deviceCounts).filter(([, s]) => s > 0).map(([device, sessions]) => ({
      device, sessions, percentage: totalSessions > 0 ? Math.round((sessions / totalSessions) * 1000) / 10 : 0,
    })).sort((a, b) => b.sessions - a.sessions);

    const dashboardPaths = ["/admin", "/client/", "/login", "/reset-password", "/web-analytics", "/report/"];
    const pageCounts: Record<string, number> = {};
    pageViewList.forEach((pv: any) => {
      const raw = pv?.page_url || pv?.path || pv?.url || "/";
      let path = "/";
      try { path = new URL(raw).pathname || "/"; } catch { path = String(raw).split("?")[0] || "/"; }
      if (dashboardPaths.some((p) => path.startsWith(p))) return;
      pageCounts[path] = (pageCounts[path] || 0) + 1;
    });

    const topPages = Object.entries(pageCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([url, views]) => ({ url, views }));

    return new Response(JSON.stringify({
      success: true,
      data: {
        visitors, pageViews: pageViewsCount, totalSessions,
        avgDuration: Math.round(avgDuration),
        bounceRate: Math.round(bounceRate * 10) / 10,
        pagesPerVisit: Math.round(pagesPerVisit * 100) / 100,
        trafficSources, deviceBreakdown, topPages,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

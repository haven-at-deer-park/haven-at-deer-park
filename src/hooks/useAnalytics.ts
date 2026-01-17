import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// ============== VISITOR & SESSION MANAGEMENT ==============

const VISITOR_ID_KEY = 'haven_visitor_id';
const SESSION_ID_KEY = 'haven_session_id';
const SESSION_START_KEY = 'haven_session_start';
const ATTRIBUTION_KEY = 'haven_session_attribution';
const INTERNAL_FLAG_KEY = 'haven_internal_flag';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// Get or create stable visitor ID (persisted in localStorage)
const getVisitorId = (): string => {
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
};

// Get or create session ID (persisted in sessionStorage with timeout check)
const getSessionId = (): string => {
  const storedSessionId = sessionStorage.getItem(SESSION_ID_KEY);
  const sessionStart = sessionStorage.getItem(SESSION_START_KEY);
  const now = Date.now();
  
  // If session exists and hasn't timed out, reuse it
  if (storedSessionId && sessionStart) {
    const sessionAge = now - parseInt(sessionStart, 10);
    if (sessionAge < SESSION_TIMEOUT_MS) {
      return storedSessionId;
    }
  }
  
  // Create new session
  const newSessionId = crypto.randomUUID();
  sessionStorage.setItem(SESSION_ID_KEY, newSessionId);
  sessionStorage.setItem(SESSION_START_KEY, now.toString());
  // Clear attribution for new session
  sessionStorage.removeItem(ATTRIBUTION_KEY);
  return newSessionId;
};

// Refresh session timestamp on activity
const refreshSessionActivity = () => {
  sessionStorage.setItem(SESSION_START_KEY, Date.now().toString());
};

// ============== DEVICE & BROWSER DETECTION ==============

const getDeviceType = (): string => {
  const ua = navigator.userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/i.test(ua) || 
      (window.innerWidth >= 768 && window.innerWidth < 1024 && 'ontouchstart' in window)) {
    return 'tablet';
  }
  if (/mobile|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile|windows phone/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

const getBrowser = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('SamsungBrowser')) return 'Samsung Browser';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Unknown';
};

const getOS = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown';
};

// ============== BOT DETECTION ==============

const BOT_PATTERNS = [
  'bot', 'crawl', 'spider', 'slurp', 'googlebot', 'bingbot', 'yandex',
  'baiduspider', 'facebookexternalhit', 'twitterbot', 'rogerbot', 'linkedinbot',
  'embedly', 'quora link preview', 'showyoubot', 'outbrain', 'pinterest',
  'applebot', 'semrush', 'ahrefsbot', 'mj12bot', 'dotbot'
];

const isBot = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  return BOT_PATTERNS.some(pattern => ua.includes(pattern));
};

// ============== UTM & ATTRIBUTION ==============

interface Attribution {
  landing_page: string;
  initial_referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
}

const getAttribution = (): Attribution | null => {
  const stored = sessionStorage.getItem(ATTRIBUTION_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return null;
};

const captureAttribution = (): Attribution => {
  // Check if already captured for this session
  const existing = getAttribution();
  if (existing) return existing;
  
  const params = new URLSearchParams(window.location.search);
  const attribution: Attribution = {
    landing_page: window.location.pathname,
    initial_referrer: document.referrer || null,
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_term: params.get('utm_term'),
    utm_content: params.get('utm_content'),
  };
  
  sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  return attribution;
};

// ============== INTERNAL TRAFFIC DETECTION ==============

const checkInternalTraffic = (): boolean => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('internal') === '1') {
    localStorage.setItem(INTERNAL_FLAG_KEY, 'true');
    return true;
  }
  return localStorage.getItem(INTERNAL_FLAG_KEY) === 'true';
};

// ============== DEDUPLICATION ==============

const PAGEVIEW_THROTTLE_MS = 2000; // 2 seconds dedupe window
const lastPageviewTime: Record<string, number> = {};
const sessionCreated: Record<string, boolean> = {};

const shouldTrackPageview = (path: string): boolean => {
  const now = Date.now();
  const lastTime = lastPageviewTime[path];
  
  if (lastTime && (now - lastTime) < PAGEVIEW_THROTTLE_MS) {
    console.log('[Analytics] Duplicate pageview blocked:', path);
    return false;
  }
  
  lastPageviewTime[path] = now;
  return true;
};

// ============== MAIN HOOK ==============

export function useAnalytics() {
  const location = useLocation();
  const sessionInitialized = useRef(false);
  const pageViewId = useRef<string | null>(null);
  const pageLoadTime = useRef<number>(Date.now());
  const maxScrollDepth = useRef(0);
  const pageCount = useRef(0);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const lastTrackedPath = useRef<string | null>(null);

  const visitorId = getVisitorId();
  const sessionId = getSessionId();
  const isBotVisitor = isBot();
  const isInternalVisitor = checkInternalTraffic();

  // Initialize session (once per session)
  const initSession = useCallback(async () => {
    if (sessionInitialized.current) return;
    if (sessionCreated[sessionId]) return;
    if (isBotVisitor) {
      console.log('[Analytics] Bot detected, skipping session init');
      return;
    }
    
    sessionInitialized.current = true;
    sessionCreated[sessionId] = true;

    const attribution = captureAttribution();
    
    // Check if visitor is repeat (has previous sessions)
    const storedVisitorId = localStorage.getItem(VISITOR_ID_KEY);
    const isRepeat = storedVisitorId && storedVisitorId === visitorId;

    try {
      await supabase.from('analytics_sessions').insert({
        visitor_id: visitorId,
        session_id: sessionId,
        device_type: getDeviceType(),
        browser: getBrowser(),
        os: getOS(),
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        referrer: attribution.initial_referrer,
        entry_page: attribution.landing_page,
        utm_source: attribution.utm_source,
        utm_medium: attribution.utm_medium,
        utm_campaign: attribution.utm_campaign,
        utm_term: attribution.utm_term,
        utm_content: attribution.utm_content,
        is_bounce: true,
        is_repeat_visitor: isRepeat,
      });

      // Track traffic source
      const source = attribution.utm_source || 
        (attribution.initial_referrer ? new URL(attribution.initial_referrer).hostname : 'direct');
      
      await supabase.from('analytics_traffic_sources').insert({
        session_id: sessionId,
        source,
        medium: attribution.utm_medium,
        campaign: attribution.utm_campaign,
        referrer_url: attribution.initial_referrer,
        referrer_domain: attribution.initial_referrer 
          ? new URL(attribution.initial_referrer).hostname 
          : null,
      });

      console.log('[Analytics] Session initialized:', sessionId, { 
        isBot: isBotVisitor, 
        isInternal: isInternalVisitor,
        source 
      });
    } catch (error) {
      console.error('[Analytics] Failed to init session:', error);
    }
  }, [visitorId, sessionId, isBotVisitor, isInternalVisitor]);

  // Track page view with deduplication
  const trackPageView = useCallback(async () => {
    if (isBotVisitor) return;
    
    const path = location.pathname;
    
    // Prevent duplicate pageview for same path
    if (lastTrackedPath.current === path) {
      console.log('[Analytics] Same path, skipping:', path);
      return;
    }
    
    if (!shouldTrackPageview(path)) return;
    
    lastTrackedPath.current = path;
    pageLoadTime.current = Date.now();
    maxScrollDepth.current = 0;
    pageCount.current += 1;

    // Refresh session activity
    refreshSessionActivity();

    // Mark as not bounce after first page
    if (pageCount.current > 1) {
      await supabase
        .from('analytics_sessions')
        .update({ is_bounce: false })
        .eq('session_id', sessionId);
    }

    try {
      const loadTime = performance.timing 
        ? performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart 
        : 0;

      const { data } = await supabase
        .from('analytics_pageviews')
        .insert({
          session_id: sessionId,
          visitor_id: visitorId,
          path,
          title: document.title,
          load_time_ms: loadTime > 0 ? loadTime : null,
        })
        .select('id')
        .single();

      if (data) {
        pageViewId.current = data.id;
        console.log('[Analytics] Pageview tracked:', path);
      }
    } catch (error) {
      console.error('[Analytics] Failed to track pageview:', error);
    }
  }, [location.pathname, sessionId, visitorId, isBotVisitor]);

  // Update page view on leave
  const updatePageView = useCallback(async () => {
    if (!pageViewId.current || isBotVisitor) return;

    const timeOnPage = Date.now() - pageLoadTime.current;

    try {
      await supabase
        .from('analytics_pageviews')
        .update({
          time_on_page_ms: timeOnPage,
          scroll_depth: maxScrollDepth.current,
        })
        .eq('id', pageViewId.current);
    } catch (error) {
      console.error('[Analytics] Failed to update pageview:', error);
    }
  }, [isBotVisitor]);

  // Update session heartbeat and exit page
  const updateSessionHeartbeat = useCallback(async () => {
    if (isBotVisitor) return;
    
    try {
      await supabase
        .from('analytics_sessions')
        .update({ 
          ended_at: new Date().toISOString(),
          exit_page: location.pathname,
        })
        .eq('session_id', sessionId);
    } catch (error) {
      console.error('[Analytics] Failed to update session heartbeat:', error);
    }
  }, [sessionId, location.pathname, isBotVisitor]);

  // Scroll tracking
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        const scrollPercent = Math.round((window.scrollY / scrollHeight) * 100);
        maxScrollDepth.current = Math.max(maxScrollDepth.current, scrollPercent);
      }
      // Refresh session activity on scroll
      refreshSessionActivity();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Initialize session on mount
  useEffect(() => {
    initSession();

    // Start heartbeat every 30 seconds
    heartbeatInterval.current = setInterval(updateSessionHeartbeat, 30000);

    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      updatePageView();
      updateSessionHeartbeat();
    };
  }, [initSession, updateSessionHeartbeat, updatePageView]);

  // Track page views on route change
  useEffect(() => {
    // Update previous page view before tracking new one
    if (pageViewId.current) {
      updatePageView();
    }
    trackPageView();
  }, [location.pathname, trackPageView, updatePageView]);

  // Handle page visibility change and beforeunload
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePageView();
        updateSessionHeartbeat();
      }
    };

    const handleBeforeUnload = () => {
      updatePageView();
      updateSessionHeartbeat();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [updatePageView, updateSessionHeartbeat]);

  return { visitorId, sessionId };
}

// ============== AIRBNB CLICK TRACKING ==============

export type AirbnbLinkLocation = 
  | 'header_book_now' 
  | 'hero_cta' 
  | 'welcome_learn_more' 
  | 'bottom_cta' 
  | 'booking_form' 
  | 'apartment_card'
  | 'mobile_menu';

export type AirbnbSuite = 'entire_place' | '7_person' | '12_person' | 'other';

interface TrackAirbnbClickParams {
  linkUrl: string;
  linkLocation: AirbnbLinkLocation;
  suite: AirbnbSuite;
  linkLabel?: string;
}

// Dedupe tracking - same click within 5 seconds
const clickDedupeMap: Record<string, number> = {};
const CLICK_DEDUPE_MS = 5000;

export const trackAirbnbClick = async ({
  linkUrl,
  linkLocation,
  suite,
  linkLabel,
}: TrackAirbnbClickParams) => {
  const sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  const visitorId = localStorage.getItem(VISITOR_ID_KEY);
  
  if (!sessionId) return;

  // Dedupe check
  const dedupeKey = `${sessionId}-${linkLocation}-${linkUrl}`;
  const now = Date.now();
  const lastClick = clickDedupeMap[dedupeKey];
  
  if (lastClick && (now - lastClick) < CLICK_DEDUPE_MS) {
    console.log('[Analytics] Duplicate Airbnb click blocked:', dedupeKey);
    return;
  }
  
  clickDedupeMap[dedupeKey] = now;

  const attribution = getAttribution();

  try {
    await supabase.from('analytics_outbound_clicks').insert({
      session_id: sessionId,
      visitor_id: visitorId,
      destination_url: linkUrl,
      page_path: window.location.pathname,
      link_text: linkLabel || linkLocation,
      button_id: linkLocation,
      button_class: suite,
      device_type: getDeviceType(),
      utm_source: attribution?.utm_source,
      utm_campaign: attribution?.utm_campaign,
    });
    
    console.log('[Analytics] Airbnb click tracked:', { linkLocation, suite, linkUrl });
  } catch (error) {
    console.error('[Analytics] Failed to track Airbnb click:', error);
  }
};

// Helper function to extract suite from URL
export const getSuiteFromUrl = (url: string): AirbnbSuite => {
  if (url.includes('ZiLcS9MN')) return 'entire_place';
  if (url.includes('aM4JIC4O')) return '7_person';
  if (url.includes('17ciaUP9')) return '12_person';
  return 'other';
};

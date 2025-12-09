import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Generate or retrieve visitor ID
const getVisitorId = (): string => {
  let visitorId = localStorage.getItem('visitor_id');
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem('visitor_id', visitorId);
  }
  return visitorId;
};

// Generate session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('session_id', sessionId);
  }
  return sessionId;
};

// Device detection
const getDeviceType = (): string => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

// Browser detection
const getBrowser = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('SamsungBrowser')) return 'Samsung Browser';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Unknown';
};

// OS detection
const getOS = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown';
};

// UTM params extraction
const getUtmParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || null,
    utm_medium: params.get('utm_medium') || null,
    utm_campaign: params.get('utm_campaign') || null,
    utm_term: params.get('utm_term') || null,
    utm_content: params.get('utm_content') || null,
  };
};

export function useAnalytics() {
  const location = useLocation();
  const sessionInitialized = useRef(false);
  const pageViewId = useRef<string | null>(null);
  const pageLoadTime = useRef<number>(Date.now());
  const maxScrollDepth = useRef(0);
  const pageCount = useRef(0);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  const visitorId = getVisitorId();
  const sessionId = getSessionId();

  // Initialize session
  const initSession = useCallback(async () => {
    if (sessionInitialized.current) return;
    sessionInitialized.current = true;

    const utmParams = getUtmParams();

    try {
      await supabase.from('analytics_sessions').insert({
        visitor_id: visitorId,
        session_id: sessionId,
        device_type: getDeviceType(),
        browser: getBrowser(),
        os: getOS(),
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        referrer: document.referrer || null,
        ...utmParams,
        is_bounce: true,
      });

      console.log('[Analytics] Session initialized:', sessionId);
    } catch (error) {
      console.error('[Analytics] Failed to init session:', error);
    }
  }, [visitorId, sessionId]);

  // Track page view
  const trackPageView = useCallback(async () => {
    pageLoadTime.current = Date.now();
    maxScrollDepth.current = 0;
    pageCount.current += 1;

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
          path: location.pathname,
          title: document.title,
          load_time_ms: loadTime > 0 ? loadTime : null,
        })
        .select('id')
        .single();

      if (data) {
        pageViewId.current = data.id;
        console.log('[Analytics] Page view tracked:', location.pathname);
      }
    } catch (error) {
      console.error('[Analytics] Failed to track page view:', error);
    }
  }, [location.pathname, sessionId, visitorId]);

  // Update page view on leave
  const updatePageView = useCallback(async () => {
    if (!pageViewId.current) return;

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
      console.error('[Analytics] Failed to update page view:', error);
    }
  }, []);

  // Update session heartbeat
  const updateSessionHeartbeat = useCallback(async () => {
    try {
      await supabase
        .from('analytics_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('session_id', sessionId);
    } catch (error) {
      console.error('[Analytics] Failed to update session heartbeat:', error);
    }
  }, [sessionId]);

  // Scroll tracking
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        const scrollPercent = Math.round((window.scrollY / scrollHeight) * 100);
        maxScrollDepth.current = Math.max(maxScrollDepth.current, scrollPercent);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Initialize session on mount
  useEffect(() => {
    initSession();

    // Start heartbeat every 30 seconds
    heartbeatInterval.current = setInterval(updateSessionHeartbeat, 30000);

    // Cleanup on unmount
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

import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Generate unique IDs
const generateId = () => crypto.randomUUID();

// Get or create visitor ID (persisted across sessions)
const getVisitorId = (): string => {
  let visitorId = localStorage.getItem('haven_visitor_id');
  if (!visitorId) {
    visitorId = generateId();
    localStorage.setItem('haven_visitor_id', visitorId);
  }
  return visitorId;
};

// Check if repeat visitor
const isRepeatVisitor = (): boolean => {
  const visits = parseInt(localStorage.getItem('haven_visit_count') || '0', 10);
  localStorage.setItem('haven_visit_count', String(visits + 1));
  return visits > 0;
};

// Get device type
const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
};

// Get browser name
const getBrowser = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Opera')) return 'Opera';
  return 'Other';
};

// Parse UTM parameters
const getUtmParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get('utm_source'),
    utmMedium: params.get('utm_medium'),
    utmCampaign: params.get('utm_campaign'),
    utmTerm: params.get('utm_term'),
    utmContent: params.get('utm_content'),
  };
};

// Get referrer source name
const getReferrerSource = (referrer: string): string => {
  if (!referrer) return 'direct';
  try {
    const url = new URL(referrer);
    const domain = url.hostname.toLowerCase();
    if (domain.includes('google')) return 'google';
    if (domain.includes('facebook') || domain.includes('fb.')) return 'facebook';
    if (domain.includes('instagram')) return 'instagram';
    if (domain.includes('tiktok')) return 'tiktok';
    if (domain.includes('twitter') || domain.includes('x.com')) return 'twitter';
    if (domain.includes('linkedin')) return 'linkedin';
    if (domain.includes('youtube')) return 'youtube';
    return domain;
  } catch {
    return 'direct';
  }
};

export function useAnalytics() {
  const location = useLocation();
  const sessionIdRef = useRef<string | null>(null);
  const visitorIdRef = useRef<string>(getVisitorId());
  const sessionStartRef = useRef<number>(Date.now());
  const pageStartRef = useRef<number>(Date.now());
  const maxScrollRef = useRef<number>(0);
  const pageviewCountRef = useRef<number>(0);

  // Send analytics event
  const sendAnalytics = useCallback(async (action: string, data: any) => {
    try {
      await supabase.functions.invoke('analytics', {
        body: { action, data }
      });
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }, []);

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        const scrollPercent = Math.round((window.scrollY / scrollHeight) * 100);
        maxScrollRef.current = Math.max(maxScrollRef.current, scrollPercent);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Start session on mount
  useEffect(() => {
    const sessionId = generateId();
    sessionIdRef.current = sessionId;
    sessionStartRef.current = Date.now();

    const utmParams = getUtmParams();
    const referrerSource = utmParams.utmSource || getReferrerSource(document.referrer);

    sendAnalytics('session-start', {
      sessionId,
      entryPage: window.location.pathname,
      deviceType: getDeviceType(),
      browser: getBrowser(),
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      referrer: document.referrer || null,
      ...utmParams,
      utmSource: referrerSource,
      isRepeatVisitor: isRepeatVisitor(),
      visitorId: visitorIdRef.current
    });

    // End session on page unload
    const handleUnload = () => {
      const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
      const isBounce = pageviewCountRef.current <= 1;

      // Use sendBeacon for reliability
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics`;
      navigator.sendBeacon(url, JSON.stringify({
        action: 'session-end',
        data: {
          sessionId: sessionIdRef.current,
          duration,
          exitPage: window.location.pathname,
          isBounce
        }
      }));
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [sendAnalytics]);

  // Track pageviews on route change
  useEffect(() => {
    if (!sessionIdRef.current) return;

    // Update previous page metrics before tracking new page
    if (pageviewCountRef.current > 0) {
      const timeOnPage = Math.round((Date.now() - pageStartRef.current) / 1000);
      sendAnalytics('update-pageview', {
        sessionId: sessionIdRef.current,
        pagePath: location.pathname,
        timeOnPage,
        scrollDepth: maxScrollRef.current
      });
    }

    // Reset for new page
    pageStartRef.current = Date.now();
    maxScrollRef.current = 0;
    pageviewCountRef.current++;

    // Track new pageview
    sendAnalytics('pageview', {
      sessionId: sessionIdRef.current,
      pagePath: location.pathname,
      pageTitle: document.title,
      visitorId: visitorIdRef.current
    });
  }, [location.pathname, sendAnalytics]);

  // Track outbound clicks (especially Airbnb)
  const trackOutboundClick = useCallback((url: string, linkText?: string, buttonId?: string, buttonClass?: string) => {
    if (!sessionIdRef.current) return;

    const utmParams = getUtmParams();
    
    sendAnalytics('outbound-click', {
      sessionId: sessionIdRef.current,
      destinationUrl: url,
      linkText,
      pagePath: location.pathname,
      buttonId,
      buttonClass,
      deviceType: getDeviceType(),
      utmSource: utmParams.utmSource,
      utmCampaign: utmParams.utmCampaign,
      visitorId: visitorIdRef.current
    });
  }, [location.pathname, sendAnalytics]);

  // Track custom events
  const trackEvent = useCallback((eventType: string, eventCategory: string, eventAction: string, eventLabel?: string, metadata?: Record<string, any>) => {
    if (!sessionIdRef.current) return;

    sendAnalytics('event', {
      sessionId: sessionIdRef.current,
      eventType,
      eventCategory,
      eventAction,
      eventLabel,
      pagePath: location.pathname,
      metadata,
      visitorId: visitorIdRef.current
    });
  }, [location.pathname, sendAnalytics]);

  return { trackOutboundClick, trackEvent };
}

// Global click handler for Airbnb links
export function setupOutboundClickTracking(trackOutboundClick: (url: string, linkText?: string, buttonId?: string, buttonClass?: string) => void) {
  const handleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a');
    
    if (link && link.href) {
      // Check if it's an Airbnb link
      if (link.href.includes('airbnb')) {
        trackOutboundClick(
          link.href,
          link.textContent || undefined,
          link.id || undefined,
          link.className || undefined
        );
      }
    }
  };

  document.addEventListener('click', handleClick, { capture: true });
  return () => document.removeEventListener('click', handleClick, { capture: true });
}
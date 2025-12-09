import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const generateVisitorId = (): string => {
  const stored = localStorage.getItem('visitor_id');
  if (stored) return stored;
  const newId = crypto.randomUUID();
  localStorage.setItem('visitor_id', newId);
  return newId;
};

const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
};

const getBrowser = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Other';
};

export const AnalyticsTracker = () => {
  const location = useLocation();
  const sessionIdRef = useRef<string | null>(null);
  const visitorId = useRef(generateVisitorId());
  const lastPath = useRef<string | null>(null);
  const pageEntryTime = useRef<number>(Date.now());

  useEffect(() => {
    const initSession = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      
      const { data } = await supabase
        .from('analytics_sessions')
        .insert({
          visitor_id: visitorId.current,
          session_id: crypto.randomUUID(),
          device_type: getDeviceType(),
          browser: getBrowser(),
          referrer: document.referrer || null,
          utm_source: urlParams.get('utm_source'),
          utm_medium: urlParams.get('utm_medium'),
          utm_campaign: urlParams.get('utm_campaign'),
        })
        .select('id')
        .maybeSingle();

      if (data) {
        sessionIdRef.current = data.id;
      }
    };

    initSession();

    const handleBeforeUnload = async () => {
      if (sessionIdRef.current) {
        await supabase
          .from('analytics_sessions')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', sessionIdRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    const trackPageView = async () => {
      if (location.pathname === lastPath.current) return;
      
      // Record time spent on previous page by creating another event
      if (lastPath.current && sessionIdRef.current) {
        const timeSpent = Date.now() - pageEntryTime.current;
        if (timeSpent > 1000) { // Only if spent more than 1 second
          await supabase.from('analytics_events').insert({
            visitor_id: visitorId.current,
            session_id: sessionIdRef.current,
            event_type: 'page_exit',
            page_path: lastPath.current,
          });
        }
      }

      lastPath.current = location.pathname;
      pageEntryTime.current = Date.now();

      await supabase.from('analytics_events').insert({
        visitor_id: visitorId.current,
        session_id: sessionIdRef.current,
        event_type: 'page_view',
        page_path: location.pathname,
      });
    };

    // Small delay to ensure session is created
    const timer = setTimeout(trackPageView, 100);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return null;
};

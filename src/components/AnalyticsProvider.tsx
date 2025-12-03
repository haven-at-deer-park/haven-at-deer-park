import { useEffect } from 'react';
import { useAnalytics, setupOutboundClickTracking } from '@/hooks/useAnalytics';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { trackOutboundClick, trackEvent } = useAnalytics();

  // Set up global click tracking for Airbnb links
  useEffect(() => {
    const cleanup = setupOutboundClickTracking(trackOutboundClick);
    return cleanup;
  }, [trackOutboundClick]);

  return <>{children}</>;
}
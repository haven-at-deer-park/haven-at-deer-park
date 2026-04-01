'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';
import { HavenConcierge } from '@/components/HavenConcierge';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <AnalyticsProvider>
            <Toaster />
            <Sonner />
            <HavenConcierge />
            {children}
          </AnalyticsProvider>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

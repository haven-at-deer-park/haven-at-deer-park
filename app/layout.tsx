import type { Metadata } from 'next';
import Script from 'next/script';
import '@/index.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Haven at Deer Park - Welcome to your next vacation',
  description: 'Haven at Deer Park is a luxury countryside retreat offering peaceful accommodations surrounded by nature. Designed for rest, reflection, and rejuvenation, the property features serene landscapes, elegant suites, and easy access to local trails and activities. Your sanctuary away from the noise—where comfort meets calm.',
  openGraph: {
    title: 'Haven at Deer Park - Welcome to your next vacation',
    description: 'Haven at Deer Park is a luxury countryside retreat offering peaceful accommodations surrounded by nature. Designed for rest, reflection, and rejuvenation, the property features serene landscapes, elegant suites, and easy access to local trails and activities. Your sanctuary away from the noise—where comfort meets calm.',
    images: ['/images/DJI_0206hdr.JPG'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Haven at Deer Park - Welcome to your next vacation',
    description: 'Haven at Deer Park is a luxury countryside retreat offering peaceful accommodations surrounded by nature. Designed for rest, reflection, and rejuvenation, the property features serene landscapes, elegant suites, and easy access to local trails and activities. Your sanctuary away from the noise—where comfort meets calm.',
    images: ['/images/DJI_0206hdr.JPG'],
  },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
        </Providers>

        {/* Outbound Click Analytics */}
        <Script id="outbound-analytics" strategy="afterInteractive">{`
          (function() {
            var SUPABASE_URL = '${process.env.NEXT_PUBLIC_SUPABASE_URL}';
            var SUPABASE_ANON_KEY = '${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}';
            function getVisitorId() {
              var vid = localStorage.getItem('_vid');
              if (!vid) { vid = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36); localStorage.setItem('_vid', vid); }
              return vid;
            }
            function getSessionId() {
              var now = Date.now();
              var sid = sessionStorage.getItem('_sid');
              var lastActive = parseInt(sessionStorage.getItem('_lastActive') || '0');
              if (!sid || (now - lastActive) > 30 * 60 * 1000) { sid = 's_' + Math.random().toString(36).substr(2, 9) + now.toString(36); sessionStorage.setItem('_sid', sid); }
              sessionStorage.setItem('_lastActive', now.toString());
              return sid;
            }
            var visitorId = getVisitorId();
            var sessionId = getSessionId();
            document.addEventListener('click', function(e) {
              var link = e.target.closest('a');
              if (!link) return;
              var href = link.href;
              if (!href) return;
              try {
                var url = new URL(href);
                if (url.hostname === window.location.hostname) return;
                fetch(SUPABASE_URL + '/rest/v1/analytics_outbound_clicks', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY, 'Prefer': 'return=minimal' },
                  body: JSON.stringify({ visitor_id: visitorId, session_id: sessionId, destination_url: href, link_text: (link.innerText || link.textContent || '').substring(0, 200), page_path: window.location.pathname, device_type: /mobile|android|iphone/i.test(navigator.userAgent) ? 'mobile' : 'desktop', timestamp: new Date().toISOString() }),
                  keepalive: true
                }).catch(function(){});
              } catch (e) {}
            }, true);
            console.log('[Analytics] Outbound click tracking initialized');
          })();
        `}</Script>
      </body>
    </html>
  );
}

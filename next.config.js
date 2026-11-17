const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy-Report-Only', value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://mhuxrnxajtiwxauhlhlv.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://emvrkeolbpynxkcjpahk.supabase.co wss://emvrkeolbpynxkcjpahk.supabase.co https://mhuxrnxajtiwxauhlhlv.supabase.co https://avkykdsuuvbxbkbdkudu.supabase.co wss://avkykdsuuvbxbkbdkudu.supabase.co; media-src 'self' blob: https://emvrkeolbpynxkcjpahk.supabase.co https://avkykdsuuvbxbkbdkudu.supabase.co; frame-src 'self' https://www.google.com; worker-src 'self' blob:; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-TNENVMES1N',
    NEXT_PUBLIC_SUPABASE_PROJECT_ID: process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID || 'emvrkeolbpynxkcjpahk',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://emvrkeolbpynxkcjpahk.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtdnJrZW9sYnB5bnhrY2pwYWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwODE3OTQsImV4cCI6MjA5MDY1Nzc5NH0.CSGVadHLvn-d_CM8MsJFchscBWFFNdjRpg9F7-yy0wY',
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = nextConfig;

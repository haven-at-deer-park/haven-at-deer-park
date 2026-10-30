const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy-Report-Only', value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://avkykdsuuvbxbkbdkudu.supabase.co wss://avkykdsuuvbxbkbdkudu.supabase.co; media-src 'self' blob: https://avkykdsuuvbxbkbdkudu.supabase.co; frame-src 'self' https://www.google.com; worker-src 'self' blob:; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = nextConfig;

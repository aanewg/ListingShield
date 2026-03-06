import type { NextConfig } from "next";

const securityHeaders = [
  // Deny framing — prevents clickjacking
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Limit referrer info to origin on cross-origin requests
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable unused browser APIs
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Content Security Policy
  // Note: Next.js App Router requires 'unsafe-inline' for hydration scripts;
  // nonce-based CSP would remove the need for it but requires middleware.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      // Allow marketplace product images (eBay CDN, FB CDN, etc.) over HTTPS
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  // HSTS — only meaningful on HTTPS; skip in local dev
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

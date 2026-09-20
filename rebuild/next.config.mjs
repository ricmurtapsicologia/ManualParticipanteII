const isVercel = process.env.VERCEL === '1';

const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' https://ricmurtapsicologia.github.io",
  "connect-src 'self' https://secretaria-digital-core.vercel.app",
  "worker-src 'self' blob:"
];

// A plataforma Vercel já entrega a aplicação por HTTPS. Manter esta diretiva
// apenas nesse ambiente evita que WebKit promova o servidor HTTP local do E2E
// para https://127.0.0.1 e impeça a hidratação dos componentes cliente.
if (isVercel) cspDirectives.push('upgrade-insecure-requests');

const csp = cspDirectives.join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  }
};

export default nextConfig;

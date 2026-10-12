import { handleQuoteApi, cleanExpiredQuotes, reconcilePendingCheckouts } from './quote-api.js';
const PRODUCTION_HOSTS = new Set(['servicepricingtools.com', 'www.servicepricingtools.com']);
const SITE_SCRIPT_HTML = '<script src="/assets/site-analytics.js"></script>';
const GOOGLE_TAG_HTML = '<!-- Google tag (gtag.js) -->' + SITE_SCRIPT_HTML + '<script async src="https://www.googletagmanager.com/gtag/js?id=G-J3BBT6YZRB"></script>';
// PayPal's JS SDK (card fields) needs its documented origins plus a per-response nonce for the
// styles it injects; the nonce is passed to the SDK via data-csp-nonce instead of allowing 'unsafe-inline'.
const PAYPAL = 'https://*.paypal.com https://*.paypalobjects.com';
export const htmlCsp = nonce => [
  "default-src 'self'",
  `script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com ${PAYPAL}`,
  `style-src 'self' 'nonce-${nonce}' ${PAYPAL}`,
  `img-src 'self' data: https://www.google-analytics.com ${PAYPAL}`,
  `frame-src ${PAYPAL}`,
  `connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://analytics.google.com https://www.googletagmanager.com ${PAYPAL}`,
  "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'self'"
].join('; ');

export default {
  async scheduled(controller, env, ctx) { ctx.waitUntil(Promise.allSettled([reconcilePendingCheckouts(env), cleanExpiredQuotes(env)])); },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/quotes')) return handleQuoteApi(request, env);
    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html') || url.pathname.startsWith('/quote-download')) return response;

    const nonce = crypto.randomUUID().replaceAll('-', '');
    const rewritten = new HTMLRewriter()
      .on('head', {
        element(element) {
          element.prepend(`<meta name="spt-csp-nonce" content="${nonce}">` + (PRODUCTION_HOSTS.has(url.hostname) ? GOOGLE_TAG_HTML : SITE_SCRIPT_HTML), { html: true });
        }
      })
      .transform(response);
    const headers = new Headers(rewritten.headers);
    headers.set('Content-Security-Policy', htmlCsp(nonce));
    return new Response(rewritten.body, { status: rewritten.status, statusText: rewritten.statusText, headers });
  }
};

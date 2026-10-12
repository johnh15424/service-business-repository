import { handleQuoteApi, cleanExpiredQuotes, reconcilePendingCheckouts } from './quote-api.js';
const GOOGLE_TAG_HTML = '<!-- Google tag (gtag.js) --><script src="/assets/site-analytics.js"></script><script async src="https://www.googletagmanager.com/gtag/js?id=G-J3BBT6YZRB"></script>';

export default {
  async scheduled(controller, env, ctx) { ctx.waitUntil(Promise.allSettled([reconcilePendingCheckouts(env), cleanExpiredQuotes(env)])); },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/quotes')) return handleQuoteApi(request, env);
    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html') || url.pathname.startsWith('/quote-download')) return response;

    return new HTMLRewriter()
      .on('head', {
        element(element) {
          element.prepend(GOOGLE_TAG_HTML, { html: true });
        }
      })
      .transform(response);
  }
};

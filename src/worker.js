// Only the live site loads the Google tag. workers.dev, preview versions and
// local development must not report to GA4, or they contaminate production
// data. site-analytics.js still loads everywhere for direct Payhip checkout
// links and checks the hostname itself before measuring anything.
const PRODUCTION_HOSTS = new Set(['servicepricingtools.com', 'www.servicepricingtools.com']);
const SITE_SCRIPT_HTML = '<script src="/assets/site-analytics.js"></script>';
const GOOGLE_TAG_HTML = '<!-- Google tag (gtag.js) -->' + SITE_SCRIPT_HTML + '<script async src="https://www.googletagmanager.com/gtag/js?id=G-J3BBT6YZRB"></script>';

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html')) return response;
    const headHtml = PRODUCTION_HOSTS.has(new URL(request.url).hostname) ? GOOGLE_TAG_HTML : SITE_SCRIPT_HTML;

    return new HTMLRewriter()
      .on('head', {
        element(element) {
          element.prepend(headHtml, { html: true });
        }
      })
      .transform(response);
  }
};

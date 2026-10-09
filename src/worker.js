const GOOGLE_TAG_HTML = '<!-- Google tag (gtag.js) --><script src="/assets/site-analytics.js"></script><script async src="https://www.googletagmanager.com/gtag/js?id=G-J3BBT6YZRB"></script>';

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html')) return response;

    return new HTMLRewriter()
      .on('head', {
        element(element) {
          element.prepend(GOOGLE_TAG_HTML, { html: true });
        }
      })
      .transform(response);
  }
};

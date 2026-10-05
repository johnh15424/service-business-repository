const GOOGLE_TAG_ID = 'G-J3BBT6YZRB';
const GOOGLE_TAG_HTML = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${GOOGLE_TAG_ID}');
</script>`;

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

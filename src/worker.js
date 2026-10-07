const GOOGLE_TAG_ID = 'G-J3BBT6YZRB';
const GOOGLE_TAG_HTML = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${GOOGLE_TAG_ID}', {\n    linker: { domains: ['servicepricingtools.com', 'payhip.com'] }\n  });

  function forwardCommercialEvent(event) {
    var detail = event && event.detail ? event.detail : {};
    var eventName = String(detail.event || '').trim();
    if (!eventName) return;

    var params = {};
    if (detail.calculator) params.calculator = detail.calculator;
    if (detail.niche) params.niche = detail.niche;
    if (detail.placement) params.placement = detail.placement;

    gtag('event', eventName, params);
  }

  window.addEventListener('calculator:conversion', forwardCommercialEvent);
  window.addEventListener('commercial:conversion', forwardCommercialEvent);
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


  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  var gaConfig = { linker: { domains: ['servicepricingtools.com', 'payhip.com'] } };
  // GA4 treats any debug_mode value, even false, as debug traffic, which its Developer traffic filter drops
  // from reports. Only send it for an explicit ?spt_debug=1 visit.
  if (new URLSearchParams(window.location.search).get('spt_debug') === '1') gaConfig.debug_mode = true;
  gtag('config', 'G-J3BBT6YZRB', gaConfig);

  function directPayhipCheckout(href) {
    var match = String(href || '').match(/^https:\/\/payhip\.com\/b\/([^/?#]+)/i);
    return match ? 'https://payhip.com/buy?link=' + encodeURIComponent(match[1]) : href;
  }

  function upgradePaidCheckoutLinks(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('a[data-paid-cta], a[data-commercial-paid]').forEach(function(link) {
      link.href = directPayhipCheckout(link.href);
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    upgradePaidCheckoutLinks(document);
    try {
      new MutationObserver(function(records) {
        records.forEach(function(record) {
          record.addedNodes.forEach(function(node) {
            if (node.nodeType !== 1) return;
            if (node.matches && node.matches('a[data-paid-cta], a[data-commercial-paid]')) {
              node.href = directPayhipCheckout(node.href);
            }
            upgradePaidCheckoutLinks(node);
          });
        });
      }).observe(document.documentElement, { childList: true, subtree: true });
    } catch {}
  });

  function forwardCommercialEvent(event) {
    var detail = event && event.detail ? event.detail : {};
    var eventName = String(detail.event || '').trim();
    if (!eventName || /^(purchase|paid_purchase|refund)$/.test(eventName)) return;

    var params = {};
    if (detail.calculator) params.calculator = detail.calculator;
    if (detail.niche) params.niche = detail.niche;
    if (detail.funnel) {
      params.funnel = detail.funnel;
      if (!params.niche) params.niche = detail.funnel;
    }
    if (detail.placement) params.placement = detail.placement;

    gtag('event', eventName, params);
  }

  window.addEventListener('calculator:conversion', forwardCommercialEvent);
  window.addEventListener('commercial:conversion', forwardCommercialEvent);
  window.addEventListener('funnel:conversion', forwardCommercialEvent);
  window.addEventListener('quote:conversion', function(event) {
    var d = event.detail || {};
    if (!/^quote_[a-z_]+$/.test(String(d.event || ''))) return;
    var p = {product_type:'professional_quote'};
    ['niche','value','currency','transaction_id','items'].forEach(function(k) { if(d[k] !== undefined) p[k] = d[k]; });
    gtag('event', d.event, p);
  });

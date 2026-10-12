
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}

  // Google Consent Mode v2. Every visitor, in every region, starts with analytics and advertising storage
  // denied; only an explicit Accept stored on this device grants it. Undecided and rejecting visitors send
  // only Google's cookieless consent-mode pings. Calculators, Payhip links, checkout and downloads never
  // depend on this choice.
  var CONSENT_KEY = 'spt_consent_v1';
  function consentState(value) {
    return { ad_storage: value, ad_user_data: value, ad_personalization: value, analytics_storage: value };
  }
  function storedConsent() {
    try {
      var saved = JSON.parse(window.localStorage.getItem(CONSENT_KEY) || 'null');
      return saved && (saved.choice === 'granted' || saved.choice === 'denied') ? saved.choice : null;
    } catch (e) { return null; }
  }
  gtag('consent', 'default', consentState('denied'));
  gtag('set', 'ads_data_redaction', true);
  var consentChoice = storedConsent();
  if (consentChoice === 'granted') gtag('consent', 'update', consentState('granted'));

  gtag('js', new Date());
  var gaConfig = { linker: { domains: ['servicepricingtools.com', 'payhip.com'] } };
  // The paid download page carries a private token in its URL fragment: report only its bare path.
  if (/^\/quote-download\//.test(window.location.pathname || '')) {
    gaConfig.page_location = window.location.origin + window.location.pathname;
    gaConfig.page_referrer = '';
  }
  // GA4 treats any debug_mode value, even false, as debug traffic, which its Developer traffic filter drops
  // from reports. Only send it for an explicit ?spt_debug=1 visit.
  if (new URLSearchParams(window.location.search).get('spt_debug') === '1') gaConfig.debug_mode = true;
  gtag('config', 'G-J3BBT6YZRB', gaConfig);

  function saveConsent(choice) {
    try { window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice: choice, at: new Date().toISOString() })); } catch (e) {}
    consentChoice = choice;
    gtag('consent', 'update', consentState(choice));
  }
  window.sptConsent = { get: function() { return consentChoice; }, set: saveConsent };

  // Minimal banner: equal-weight Accept and Reject, shown until a choice is stored, reopened from
  // "Cookie settings". Styles are set through the DOM so the strict CSP needs no inline style rules.
  function css(el, styles) { for (var k in styles) el.style[k] = styles[k]; return el; }
  function showConsentBanner() {
    if (document.getElementById('spt-consent')) return;
    var bar = css(document.createElement('section'), { position: 'fixed', left: '0', right: '0', bottom: '0', zIndex: '2147483000', background: '#0f172a', color: '#fff', padding: '12px 16px', boxShadow: '0 -2px 8px rgba(0,0,0,.2)', font: '15px/1.4 system-ui, sans-serif' });
    bar.id = 'spt-consent';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Cookie choices');
    var text = css(document.createElement('p'), { margin: '0 0 8px', maxWidth: '760px' });
    text.textContent = 'We would like to use optional Google Analytics and advertising cookies to measure visits and purchases. The calculators, checkout and downloads work either way.';
    var row = css(document.createElement('div'), { display: 'flex', gap: '8px', flexWrap: 'wrap' });
    [['Accept', 'granted'], ['Reject', 'denied']].forEach(function(option) {
      var b = css(document.createElement('button'), { minHeight: '44px', minWidth: '120px', padding: '10px 18px', border: '2px solid #fff', borderRadius: '6px', background: '#fff', color: '#0f172a', font: 'inherit', fontWeight: '700', cursor: 'pointer' });
      b.type = 'button';
      b.textContent = option[0];
      b.addEventListener('click', function() { saveConsent(option[1]); bar.remove(); });
      row.appendChild(b);
    });
    bar.appendChild(text);
    bar.appendChild(row);
    document.body.appendChild(bar);
  }
  function addSettingsLink() {
    if (document.getElementById('spt-consent-settings')) return;
    var link = css(document.createElement('button'), { background: 'none', border: '0', padding: '12px 0', color: 'inherit', textDecoration: 'underline', font: 'inherit', cursor: 'pointer', minHeight: '44px' });
    link.id = 'spt-consent-settings';
    link.type = 'button';
    link.textContent = 'Cookie settings';
    link.addEventListener('click', showConsentBanner);
    var holder = document.querySelector('footer') || css(document.createElement('div'), { textAlign: 'center', padding: '8px 16px 72px' });
    if (!holder.isConnected) document.body.appendChild(holder);
    holder.appendChild(link);
  }

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
    addSettingsLink();
    if (consentChoice === null) showConsentBanner();
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

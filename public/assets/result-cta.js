// Shared compact paid CTA for the first commercial moment: immediately after the headline
// result and before the detailed result rows.
//
// The fuller .result-toolkit block after the breakdown is the second commercial moment and is
// left untouched by this module.
//
// Product URLs and price always come from niche-registry.js. Nothing here hardcodes Payhip.
import { nicheById } from './niche-registry.js';

const GA4_MEASUREMENT_ID = 'G-J3BBT6YZRB';
const GA4_LOADER_ID = 'service-pricing-tools-ga4';

// Load the site's Google tag once. Every live calculator runtime imports this shared module,
// so analytics stays consistent across legacy, generated and factory calculators without
// duplicating the gtag snippet in every page.
function initGoogleTag() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(){ window.dataLayer.push(arguments); };

  if (!document.getElementById(GA4_LOADER_ID)) {
    const script = document.createElement('script');
    script.id = GA4_LOADER_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
    document.head.appendChild(script);
  }

  if (!window.__servicePricingToolsGa4Configured) {
    window.__servicePricingToolsGa4Configured = true;
    window.gtag('js', new Date());
    window.gtag('config', GA4_MEASUREMENT_ID);
  }
}

initGoogleTag();

// Calculator runtimes already dispatch calculator:conversion events for funnel actions.
// Forward those events into GA4 so calculator completions, free-checklist clicks and paid-toolkit
// clicks can be reported as events and later configured as secondary conversions if useful.
if (!window.__servicePricingToolsGa4ConversionListener) {
  window.__servicePricingToolsGa4ConversionListener = true;
  window.addEventListener('calculator:conversion', event => {
    const detail = event?.detail || {};
    const eventName = String(detail.event || '').trim();
    if (!eventName) return;

    const params = {};
    if (detail.calculator) params.calculator = detail.calculator;
    if (detail.placement) params.placement = detail.placement;
    window.gtag('event', eventName, params);
  });
}

const MOUNT_ID = 'compact-paid-cta';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

/**
 * Insert the compact paid CTA and the free-versus-paid comparison.
 * Idempotent: repeated calls, re-initialisation and recalculation never duplicate the block.
 *
 * @param {string} nicheId registry id, e.g. 'gutter_cleaning'
 * @returns {HTMLElement|null} the mounted element, or null when nothing was inserted
 */
export function mountCompactPaidCta(nicheId) {
  const existing = document.getElementById(MOUNT_ID);
  if (existing) return existing;

  const niche = nicheById(nicheId);
  if (!niche || !niche.proUrl) return null;

  // Verified present and unique in all six runtimes: the detailed rows always follow the
  // headline result, the error box and the minimum-charge note.
  const rows = document.querySelector('dl.results');
  if (!rows || !rows.parentNode) return null;

  const price = Number(niche.proPrice || 24.99).toFixed(2);
  const section = document.createElement('section');
  section.id = MOUNT_ID;
  section.className = 'compact-paid-cta';
  section.setAttribute('aria-labelledby', `${MOUNT_ID}-title`);
  section.innerHTML = `<p class="compact-paid-cta-title" id="${MOUNT_ID}-title">Want to price every job this way?</p><a class="primary button-link" href="${esc(niche.proUrl)}" data-funnel="${esc(niche.id)}" data-paid-cta="result-compact">Get the ${esc(niche.name)} Pricing &amp; Profit Toolkit · €${price} ↗</a><div class="free-paid-compare"><div><p class="free-paid-heading">Free calculator</p><ul><li>One-job estimate in the browser</li><li>Core job costing</li><li>Free to keep using</li></ul></div><div><p class="free-paid-heading">Pro Toolkit · €${price}</p><ul><li>Reusable pricing workbook</li><li>Save and review past jobs</li><li>Job costing and service examples</li><li>Monthly planning</li><li>Downloadable working tool</li></ul></div></div>`;

  rows.parentNode.insertBefore(section, rows);
  return section;
}

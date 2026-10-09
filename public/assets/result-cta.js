// Shared compact paid CTA for the first commercial moment: immediately after the headline
// result and before the detailed result rows.
//
// The fuller .result-toolkit block after the breakdown is the second commercial moment and is
// left untouched by this module.
//
// Product URLs and price always come from niche-registry.js. Nothing here hardcodes Payhip.
import { nicheById } from './niche-registry.js';

// Funnel events are forwarded to GA4 sitewide by the Cloudflare Worker.

const MOUNT_ID = 'compact-paid-cta';
const toolkitProof = {
  house_cleaning: '6 workbook tabs including Job Calculator, Quote Builder, Monthly Planner and Break-even',
  mobile_car_detailing: '6 workbook tabs including Job Calculator, Quote Builder, Monthly Planner and Break-even',
  pressure_washing: '6 workbook tabs including Service Pricing, Quote Builder, Capacity Planner and Break-even',
  dog_grooming: '12-tab toolkit including Dashboard, Price Calculator, Quote Builder, Service Profitability and Break-even'
};

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
  section.innerHTML = `<p class="compact-paid-cta-title" id="${MOUNT_ID}-title">Want to price every job this way?</p><a class="primary button-link" href="${esc(niche.proUrl)}" data-funnel="${esc(niche.id)}" data-paid-cta="result-compact">Get the ${esc(niche.name)} Pricing &amp; Profit Toolkit · €${price} ↗</a><p class="micro">One-time payment. Download through Payhip after checkout. No subscription.</p><div class="free-paid-compare"><div><p class="free-paid-heading">Free calculator</p><ul><li>One-job estimate in the browser</li><li>Core job costing</li><li>Free to keep using</li></ul></div><div><p class="free-paid-heading">Pro Toolkit · €${price}</p><ul><li>Reusable pricing workbook</li><li>${esc(toolkitProof[niche.id] || 'Job costing, quote support and profit planning')}</li><li>Monthly planning</li><li>Break-even analysis</li><li>Downloadable working tool</li></ul></div></div>`;

  rows.parentNode.insertBefore(section, rows);
  return section;
}

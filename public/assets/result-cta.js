// Shared three-tier conversion component for every calculator page:
//   free calculator → €4 professional quote (primary) → €24.99 Pro Pricing Toolkit (secondary),
//   with the free checklist as a light option for visitors not ready to buy.
//
// Product URLs and prices come only from niche-registry.js and quote-model.js. A niche with no published
// checklist or toolkit simply shows no such offer: there are no placeholders.
//
// The €4 offer is driven by quote-preview.js: its buttons here carry [data-quote-open] and stay hidden
// until the server confirms checkout is ready ('spt:quote-availability'). Opening the editor is a request
// ('spt:open-quote'); nothing on this page takes a payment.
//
// Links use [data-free-cta] / [data-paid-cta] so each calculator runtime's existing click tracking records
// them exactly once. This module adds no click listeners of its own to those links.
import { nicheById } from './niche-registry.js';
import { QUOTE_PRICE, priceLabel } from './quote-model.js';

const HERO_ID = 'spt-offer-hero', OFFERS_ID = 'spt-offers', EXPLAIN_ID = 'spt-estimate-explain';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Workbook contents confirmed for these toolkits; others get the generic description.
const toolkitProof = {
  house_cleaning: 'Job Calculator, Service Examples, Customer Quote Builder, Monthly Planner and Break-even tabs',
  mobile_car_detailing: 'Job Calculator, Service Examples, Customer Quote Builder, Monthly Planner and Break-even tabs',
  pressure_washing: 'Job Calculator, Service Pricing, Customer Quote Builder, Capacity Planner and Break-even tabs',
  dog_grooming: '12 tabs including Dashboard, Price Calculator, Quote Builder, Service Profitability and Break-even'
};

export const quoteOfferCopy = Object.freeze({
  headline: 'Turn your price into a professional customer quote',
  body: 'Create a clear, professional PDF quotation using your calculated price. Ready to send to your customer.',
  button: price => `Create my professional quote for ${price}`,
  reassurance: 'Review your quote before paying. One-time payment. No subscription.'
});

function dispatch(name, detail) { try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch {} }

/**
 * Mount the hero offer, the result explanation and the toolkit and checklist offers.
 * Idempotent: repeated calls never duplicate anything.
 * @param {string} nicheId registry id, e.g. 'gutter_cleaning'
 */
export function mountConversion(nicheId) {
  if (document.getElementById(OFFERS_ID)) return document.getElementById(OFFERS_ID);
  const niche = nicheById(nicheId);
  const estimate = document.getElementById('estimate');
  if (!niche || !estimate) return null;
  const quotePrice = priceLabel(QUOTE_PRICE.minor, QUOTE_PRICE.currency);
  const proPrice = '€' + Number(niche.proPrice || 24.99).toFixed(2);
  const form = estimate.closest('.calculator-layout')?.querySelector('form') || document.querySelector('main form');
  if (form && !form.id) form.id = 'calculator-form';
  const heroPrice = document.querySelector('[data-result="hero"]');

  // Legacy single-tier blocks are superseded by this component.
  document.querySelectorAll('.hero-commercial, #estimate .result-toolkit, #compact-paid-cta').forEach(n => n.remove());

  // 1. Hero: a live example estimate and the €4 next step, with the free calculator still first in the flow.
  const hero = document.querySelector('main .hero');
  if (hero && !document.getElementById(HERO_ID)) {
    const box = document.createElement('section');
    box.id = HERO_ID;
    box.className = 'spt-offer-hero';
    box.setAttribute('aria-labelledby', HERO_ID + '-title');
    const extras = [
      niche.freeUrl ? `<a href="${esc(niche.freeUrl)}" data-free-cta="hero">Free ${esc(niche.name)} pricing checklist</a>` : '',
      niche.proUrl ? `<a href="${esc(niche.proUrl)}" data-paid-cta="hero">Pro Pricing Toolkit · ${proPrice}</a>` : ''
    ].filter(Boolean);
    box.innerHTML = `<p class="spt-tier-line"><span>Free calculator</span><span>${esc(quotePrice)} professional quote</span>${niche.proUrl ? `<span>Optional ${proPrice} toolkit</span>` : ''}</p>
<p class="spt-live"><span data-spt-estimate-label>Example job estimate</span> <strong data-spt-live-price>${esc(heroPrice?.textContent || '')}</strong></p>
<div data-quote-only hidden><h2 id="${HERO_ID}-title">${esc(quoteOfferCopy.headline)}</h2><p>${esc(quoteOfferCopy.body)}</p>
<button type="button" class="primary spt-quote-button" data-quote-open="hero">${esc(quoteOfferCopy.button(quotePrice))}</button>
<p class="micro">${esc(quoteOfferCopy.reassurance)}</p></div>
${form ? `<a class="text-link spt-adjust" href="#${esc(form.id)}">Enter your own job details ↓</a>` : ''}
${extras.length ? `<p class="spt-hero-extras">${extras.join('<span aria-hidden="true"> · </span>')}</p>` : ''}`;
    const lead = hero.querySelector('.lead');
    (lead || hero.lastElementChild)?.after(box);
  }

  // 2. Results: a plain-language explanation under the recommended price, then the offers.
  const top = estimate.querySelector('.estimate-top');
  const explain = document.createElement('p');
  explain.id = EXPLAIN_ID;
  explain.className = 'spt-estimate-explain';
  explain.innerHTML = '<span class="spt-badge" data-spt-estimate-label>Example job estimate</span> <span data-spt-explain-text></span>';
  (top || estimate.firstElementChild)?.after(explain);

  const offers = document.createElement('section');
  offers.id = OFFERS_ID;
  offers.className = 'spt-offers';
  offers.setAttribute('aria-label', 'Next steps');
  const proof = toolkitProof[niche.id];
  offers.innerHTML = [
    niche.proUrl ? `<div class="spt-offer spt-offer-toolkit"><p class="spt-offer-title">Need to price jobs regularly?</p><p>The Pro Pricing Toolkit gives you reusable workbooks for job costing, pricing, profit planning and running a more profitable service business.</p>${proof ? `<p class="micro">Includes ${esc(proof)}.</p>` : ''}<p class="spt-offer-price">${proPrice} once-off</p><a class="secondary button-link" href="${esc(niche.proUrl)}" data-paid-cta="results-toolkit">Get the ${esc(niche.name)} Pro Pricing Toolkit</a><p class="micro">Digital download through Payhip after payment. No subscription.</p></div>` : '',
    niche.freeUrl ? `<div class="spt-offer spt-offer-free"><p class="spt-offer-title">Free ${esc(niche.name)} Pricing Checklist</p><p>Make sure you haven't overlooked important costs when pricing your next job.</p><a class="text-link" href="${esc(niche.freeUrl)}" data-free-cta="results-checklist">Get the free checklist</a><p class="micro">Free download through Payhip.</p></div>` : '',
    `<details class="spt-tiers"><summary>Free, ${esc(quotePrice)}${niche.proUrl ? ' or ' + proPrice : ''}: which do I need?</summary><ul><li><strong>Free calculator:</strong> work out a price for a job.</li><li data-quote-only hidden><strong>${esc(quotePrice)} Quote Generator:</strong> produce a professional customer quotation you can send.</li>${niche.proUrl ? `<li><strong>${proPrice} Pro Toolkit:</strong> manage and improve pricing across repeated jobs.</li>` : ''}</ul></details>`
  ].join('');
  explain.after(offers);

  // 3. Keep the hero price and the explanation in step with the calculator, and tell example figures
  // apart from the visitor's own. Example buttons fill fields without input events, so only a real
  // edit switches the label.
  let edited = false;
  const labels = () => document.querySelectorAll('[data-spt-estimate-label]');
  const setEdited = value => {
    edited = value;
    document.body.dataset.sptEstimate = value ? 'own' : 'example';
    labels().forEach(n => { n.textContent = value ? 'Your estimate' : 'Example job estimate'; });
  };
  setEdited(false);
  form?.addEventListener('input', e => { if (e.isTrusted && !edited) setEdited(true); });
  form?.addEventListener('change', e => { if (e.isTrusted && !edited && e.target.matches('input,select,textarea')) setEdited(true); });
  document.querySelectorAll('#apply-example, #reset, [data-apply-example]').forEach(b => b.addEventListener('click', () => setEdited(false)));

  const read = key => document.querySelector(`[data-result="${key}"]`)?.textContent.trim();
  const valid = text => text && text !== '—';
  let completed = false, settle = 0;
  const refresh = () => {
    const price = read('hero');
    document.querySelectorAll('[data-spt-live-price]').forEach(n => { n.textContent = valid(price) ? price : 'Check your inputs'; });
    const hours = read('labourHours'), margin = read('margin') || read('retainedMargin');
    const text = explain.querySelector('[data-spt-explain-text]');
    text.textContent = !valid(price) ? 'Check the highlighted inputs to see a price.'
      : `Covers ${valid(hours) ? hours + ' paid labour hours, ' : 'paid labour, '}job costs, travel and overhead${valid(margin) ? `, with a ${margin} retained margin` : ''}.`;
    // A visitor who has entered their own figures and has a valid price has completed the calculator,
    // whether or not they press the calculate button. Counted once per page.
    clearTimeout(settle);
    if (edited && !completed && valid(price)) settle = setTimeout(() => {
      if (completed || !valid(read('hero'))) return;
      completed = true;
      dispatch('calculator:conversion', { event: 'calculator_completed', calculator: niche.id, placement: 'auto' });
    }, 1500);
  };
  if (heroPrice) new MutationObserver(refresh).observe(heroPrice, { childList: true, characterData: true, subtree: true });
  refresh();

  // The fixed mobile "View estimate" bar is only useful while neither the hero offer nor the estimate is on
  // screen; otherwise it covers the very offer it points to.
  const quick = document.getElementById('quick-estimate'), watched = [document.getElementById(HERO_ID), estimate].filter(Boolean);
  if (quick && 'IntersectionObserver' in window) {
    const visible = new Set();
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => en.isIntersecting ? visible.add(en.target) : visible.delete(en.target));
      quick.classList.toggle('spt-quick-hidden', visible.size > 0);
    });
    watched.forEach(n => io.observe(n));
  }

  // 4. The €4 offer appears only once quote-preview.js reports that checkout can actually be completed.
  window.addEventListener('spt:quote-availability', e => {
    const on = Boolean(e.detail?.available);
    document.querySelectorAll('[data-quote-only]').forEach(n => { n.hidden = !on; });
    if (e.detail?.label) document.querySelectorAll('[data-quote-open].spt-quote-button').forEach(b => { b.textContent = quoteOfferCopy.button(e.detail.label); });
  });
  document.addEventListener('click', e => {
    const button = e.target.closest?.('[data-quote-open]');
    if (button && !button.closest('.quote-entry')) dispatch('spt:open-quote', { placement: button.dataset.quoteOpen });
  });
  return offers;
}

// Kept for the six calculator runtimes, which already call it before mounting the quote editor.
export const mountCompactPaidCta = mountConversion;

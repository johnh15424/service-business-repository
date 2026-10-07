// Renders public/calculators/index.html from niche-registry.js.
//
// Cards are emitted as static, crawlable HTML so the directory works with JavaScript disabled
// and so Google sees every calculator and every toolkit link. public/assets/directory-filter.js
// only shows and hides cards that are already in the document; it never creates them.
//
// Only status: 'live' niches are rendered, so build-stage niches stay off the directory until
// their products and funnels exist.
import { liveNiches } from '../public/assets/niche-registry.js';

const FALLBACK_DESCRIPTION =
  'Build a quote from labour, direct job costs, travel, overhead, fees, margin and tax.';

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function card(niche) {
  const description = niche.directoryDescription || FALLBACK_DESCRIPTION;
  const price = Number(niche.proPrice || 24.99).toFixed(2);
  const pro = niche.proUrl
    ? `<a class="directory-pro" href="${escapeHtml(niche.proUrl)}" data-funnel="${escapeHtml(niche.id)}" data-paid-cta="directory-card">Pro Pricing &amp; Profit Toolkit · €${price} ↗</a>`
    : '<span class="coming">Pro Toolkit being prepared</span>';
  return `<article class="directory-card" data-niche="${escapeHtml(niche.id)}" data-category="${escapeHtml(niche.category)}" data-name="${escapeHtml(niche.name.toLowerCase())}"><span class="directory-category">${escapeHtml(niche.category)}</span><h3>${escapeHtml(niche.name)}</h3><p>${escapeHtml(description)}</p><a class="directory-open" href="${escapeHtml(niche.calculatorPath)}">Open free calculator ↗</a>${pro}</article>`;
}

export function renderDirectory(niches = liveNiches()) {
  const cards = niches.map(card).join('');
  // The controls container ships EMPTY. directory-filter.js injects the search field and the
  // category chips together, so a visitor without JavaScript never sees a filter control that
  // cannot work. Each card still carries its category as visible text, so the categories remain
  // crawlable without the chips.
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#153f38"><title>Service Business Pricing Calculators | Service Pricing Tools</title><meta name="description" content="Browse free pricing calculators for service businesses including cleaning, lawn care, pressure washing, detailing, handyman, painting, gutter cleaning and dog grooming."><link rel="canonical" href="https://servicepricingtools.com/calculators/"><link rel="icon" href="/assets/paw.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/styles.css"></head><body><a class="skip" href="#main">Skip to content</a><header><nav class="wrap nav" aria-label="Main navigation"><a class="brand" href="/"><img src="/assets/paw.svg" alt="" width="32" height="32">Service Pricing <span>Tools</span></a><div><a href="/calculators/">Calculators</a><a href="/cost-guides/">Cost guides</a></div></nav></header><main id="main" class="wrap"><section class="hero home-hero"><p class="eyebrow">SERVICE BUSINESS CALCULATOR DIRECTORY</p><h1>Find your service.<br><em>Price the whole job.</em></h1><p class="lead">Free calculators built around labour, direct job costs, travel, overhead, fees, margin and tax. Choose the closest business type and replace the example figures with your own costs.</p></section><section class="home-card"><div><p class="eyebrow">BUSINESS-WIDE CALCULATORS</p><h2>Check margin and break-even before refining individual job prices.</h2><p>Use these tools across any service niche, then move into the niche calculator for job-level costing.</p></div><ul><li><a href="/service-business-profit-margin-calculator/">Service Business Profit Margin Calculator ↗</a></li><li><a href="/service-business-break-even-calculator/">Service Business Break-even Calculator ↗</a></li></ul></section><section class="directory"><div class="directory-controls" data-directory-controls hidden></div><div class="directory-grid" data-directory-grid>${cards}</div><p class="directory-empty" data-directory-empty hidden>No calculator matches that search yet. Try a different trade name, or clear the filters to see all ${niches.length} calculators.</p></section><section class="home-card"><div><p class="eyebrow">HOW TO USE THE TOOLS</p><h2>Use the calculator as a pricing model, not a generic market-price lookup.</h2><p>Start with the closest job type, replace every example with the business's real costs, review the suggested tax treatment and set a margin and minimum charge that fit the business.</p><p><a class="secondary button-link" href="/cost-guides/">Browse cost guides ↗</a></p></div><ul><li>Count all paid labour time</li><li>Recover direct job costs and travel</li><li>Allocate monthly overhead</li><li>Review fees, contingency, tax and retained margin</li></ul></section></main><script type="module" src="/assets/directory-filter.js"></script><footer class="wrap footer"><a class="brand" href="/">Service Pricing Tools</a><p>Free pricing calculators and commercial planning tools for service businesses.</p><p>Planning support, not accounting, tax, legal or specialist safety advice. Review your costs, scope and obligations before quoting.</p><small>Service Pricing Tools · 2026</small></footer></body></html>`;
}

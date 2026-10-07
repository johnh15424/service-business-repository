import { nicheById } from './niche-registry.js';

function esc(value){
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function track(event, niche, placement){
  const detail = { event, niche, placement };
  try { window.dataLayer = window.dataLayer || []; window.dataLayer.push(detail); } catch {}
  try { window.dispatchEvent(new CustomEvent('commercial:conversion', { detail })); } catch {}
}

const toolkitProof = {
  house_cleaning: ['Job Calculator','Service Examples','Customer Quote Builder','Monthly Planner','Break-even analysis','Quick Start guide'],
  mobile_car_detailing: ['Job Calculator','Service Examples','Customer Quote Builder','Monthly Planner','Break-even analysis','Quick Start guide'],
  pressure_washing: ['Job Calculator','Service Pricing model','Customer Quote Builder','Monthly Revenue & Capacity Planner','Break-even analysis','Quick Start guide'],
  dog_grooming: ['Pricing Calculator','Business Dashboard','Customer Quote Builder','Service Menu','Service Profitability','Consumables tracker','Monthly Planner','Break-even & Capacity']
};

function renderFunnel(node){
  const niche = nicheById(node.dataset.niche);
  if (!niche) return;
  const placement = node.dataset.placement || 'content';
  const paid = niche.proUrl
    ? `<a class="primary button-link" href="${esc(niche.proUrl)}" data-commercial-paid>Get the ${esc(niche.name)} Pro Toolkit - €${Number(niche.proPrice || 24.99).toFixed(2)} ↗</a>`
    : '';
  const calculator = niche.calculatorPath
    ? `<a class="secondary button-link" href="${esc(niche.calculatorPath)}" data-commercial-calculator>Use the free calculator ↗</a>`
    : '';
  const free = niche.freeUrl
    ? `<a class="text-link" href="${esc(niche.freeUrl)}" data-commercial-free>Download the free pricing checklist ↗</a>`
    : '';

  const proof = toolkitProof[niche.id] || ['Reusable job-costing workbook','Customer quote support','Monthly profit planning','Break-even analysis'];
  const proofList = '<ul class="toolkit-proof">' + proof.map(item => '<li>' + esc(item) + '</li>').join('') + '</ul>';
  node.innerHTML = `<section class="result-toolkit commercial-funnel">
    <p class="eyebrow">${esc(niche.name.toUpperCase())} PRICING SYSTEM</p>
    <h2>Build a repeatable pricing system</h2>
    <p>The €${Number(niche.proPrice || 24.99).toFixed(2)} ${esc(niche.name)} Pricing Calculator & Profit Toolkit is a downloadable working system for pricing jobs, preparing quotes and checking profitability.</p>
    ${proofList}
    ${paid}
    <p class="micro">Prefer to try the method first? The calculator is free.</p>
    ${calculator}
    <div class="commercial-fallback">${free}</div>
  </section>`;

  node.querySelector('[data-commercial-paid]')?.addEventListener('click', () => track('paid_cta_clicked', niche.id, placement));
  node.querySelector('[data-commercial-calculator]')?.addEventListener('click', () => track('calculator_cta_clicked', niche.id, placement));
  node.querySelector('[data-commercial-free]')?.addEventListener('click', () => track('free_checklist_clicked', niche.id, placement));
}

document.querySelectorAll('[data-commercial-funnel][data-niche]').forEach(renderFunnel);

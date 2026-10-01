// Provider-neutral conversion hooks and homepage enhancements for Service Pricing Tools.
// No cookies, personal data or network requests are created here.
function track(event, link) {
  const detail = {
    event,
    funnel: link.dataset.funnel || 'unknown',
    placement: link.dataset.freeCta || link.dataset.paidCta || 'unknown'
  };
  try { window.dataLayer = window.dataLayer || []; window.dataLayer.push(detail); } catch {}
  try { window.dispatchEvent(new CustomEvent('funnel:conversion', { detail })); } catch {}
}
function bind(root=document){
  root.querySelectorAll('[data-free-cta]').forEach(link => {
    if(link.dataset.bound)return; link.dataset.bound='1';
    link.addEventListener('click', () => track('free_checklist_clicked', link));
  });
  root.querySelectorAll('[data-paid-cta]').forEach(link => {
    if(link.dataset.bound)return; link.dataset.bound='1';
    link.addEventListener('click', () => track('paid_cta_clicked', link));
  });
}

const directory=document.querySelector('#calculators .three-cards');
if(directory && !directory.querySelector('[data-niche="mobile-detailing"]')){
  const card=document.createElement('article');
  card.dataset.niche='mobile-detailing';
  card.innerHTML='<span>04 / LIVE</span><h3>Mobile Car Detailing</h3><p>Price detailing work from vehicle size and condition, door-to-door labour, chemicals, water, power, equipment wear, travel, overhead, fees, margin and tax.</p><a href="/mobile-car-detailing-price-calculator/">Open Mobile Detailing Calculator ↗</a>';
  directory.append(card);
}

const main=document.querySelector('main');
if(main && !document.getElementById('new-niche-products')){
  const wrap=document.createElement('div'); wrap.id='new-niche-products';
  wrap.innerHTML=`
  <section class="toolkit"><div><p class="eyebrow">HOUSE CLEANING RESOURCES</p><h2>From free checklist to a complete pricing system.</h2><p>Review labour, supplies, travel, overhead, minimum charge, fees, tax and margin, then take the model into quoting and break-even planning.</p><a class="secondary button-link" href="https://payhip.com/b/Q5fPh" data-funnel="house_cleaning" data-free-cta="house-homepage">Free House Cleaning Checklist ↗</a> <a class="primary button-link" href="https://payhip.com/b/9rEyJ" data-funnel="house_cleaning" data-paid-cta="house-homepage">House Cleaning Pro - €24.99 ↗</a></div><div class="workbook-art" aria-hidden="true"><span>HOUSE CLEANING</span><strong>Pricing<br>Toolkit</strong><div class="sheet-lines"></div><small>Pricing · Quotes · Planning · Break-even</small></div></section>
  <section class="home-card"><div><p class="eyebrow">MOBILE CAR DETAILING</p><h2>Price the whole appointment, not just the polishing time.</h2><p>Vehicle size, condition, travel, setup, chemicals, water, electricity and equipment wear all affect the real job economics.</p><a class="primary button-link" href="/mobile-car-detailing-price-calculator/">Open the Mobile Detailing Calculator ↗</a></div><ul><li>Vehicle size and condition adjustments</li><li>Door-to-door labour and travel time</li><li>Water, power, chemicals and equipment wear</li><li>Global currency support, editable tax and margin</li></ul></section>
  <section class="toolkit"><div><p class="eyebrow">MOBILE DETAILING RESOURCES</p><h2>Use the free checklist, then move into full job costing.</h2><p>Review the hidden costs of a mobile detailing appointment and use the Pro Toolkit for quoting, monthly planning and break-even analysis.</p><a class="secondary button-link" href="https://payhip.com/b/L4SPu" data-funnel="mobile_car_detailing" data-free-cta="detailing-homepage">Free Mobile Detailing Checklist ↗</a> <a class="primary button-link" href="https://payhip.com/b/6w2cQ" data-funnel="mobile_car_detailing" data-paid-cta="detailing-homepage">Mobile Detailing Pro - €24.99 ↗</a></div><div class="workbook-art" aria-hidden="true"><span>MOBILE DETAILING</span><strong>Pricing<br>Toolkit</strong><div class="sheet-lines"></div><small>Pricing · Quotes · Planning · Break-even</small></div></section>`;
  main.append(wrap);
}

bind();

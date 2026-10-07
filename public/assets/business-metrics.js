import { liveNiches } from './niche-registry.js';

const money=(n,currency)=>new Intl.NumberFormat('en-GB',{style:'currency',currency}).format(Number.isFinite(n)?n:0);
const n=id=>Number(document.getElementById(id)?.value||0);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function populateNiches(select){
  for(const niche of liveNiches()){
    const o=document.createElement('option');o.value=niche.id;o.textContent=niche.name;select.append(o);
  }
}
function currentNiche(){
  const id=document.getElementById('niche')?.value;
  return liveNiches().find(x=>x.id===id)||liveNiches()[0];
}
function updateOffer(){
  const box=document.getElementById('metric-offer'); if(!box) return;
  const niche=currentNiche(); if(!niche?.proUrl){box.hidden=true;return;}
  box.hidden=false;
  box.innerHTML='<p class="eyebrow">NEXT STEP</p><h2>Use this in your '+esc(niche.name)+' pricing system</h2><p>The €'+Number(niche.proPrice||24.99).toFixed(2)+' Pro Toolkit adds reusable job costing, quote building and profit planning for this niche.</p><a class="primary button-link" data-paid-cta="business-metric" href="'+esc(niche.proUrl)+'">Get the '+esc(niche.name)+' Pro Toolkit · €'+Number(niche.proPrice||24.99).toFixed(2)+' ↗</a><p class="micro"><a href="'+esc(niche.calculatorPath)+'">Or use the free '+esc(niche.name)+' pricing calculator ↗</a></p>';
}
function track(name){
  const niche=currentNiche();
  const detail={event:name,niche:niche?.id||'service_business',placement:'business-metric'};
  try{window.dispatchEvent(new CustomEvent('commercial:conversion',{detail}))}catch{}
}

const nicheSelect=document.getElementById('niche');
if(nicheSelect){populateNiches(nicheSelect);nicheSelect.addEventListener('change',()=>{updateOffer();run();});}

function runProfit(){
 const c=document.getElementById('currency').value;
 const revenue=n('revenue'), labour=n('labour'), direct=n('direct'), overhead=n('overhead'), feePct=n('feePct')/100, target=n('target')/100;
 const fees=revenue*feePct, profit=revenue-labour-direct-overhead-fees, margin=revenue>0?profit/revenue:0, costBase=labour+direct+overhead;
 const denom=1-target-feePct;
 const required=denom>0?costBase/denom:0;
 document.querySelector('[data-result="profit"]').textContent=money(profit,c);
 document.querySelector('[data-result="margin"]').textContent=(margin*100).toFixed(1)+'%';
 document.querySelector('[data-result="fees"]').textContent=money(fees,c);
 document.querySelector('[data-result="required"]').textContent=denom>0?money(required,c):'Check target';
}
function runBreakEven(){
 const c=document.getElementById('currency').value;
 const fixed=n('fixed'), price=n('price'), variable=n('variable'), feePct=n('feePct')/100, capacity=n('capacity');
 const fee=price*feePct, contribution=price-variable-fee;
 const jobs=contribution>0?fixed/contribution:0, revenue=jobs*price, util=capacity>0?jobs/capacity:0;
 document.querySelector('[data-result="contribution"]').textContent=money(contribution,c);
 document.querySelector('[data-result="jobs"]').textContent=contribution>0?Math.ceil(jobs).toLocaleString('en-GB'):'Check inputs';
 document.querySelector('[data-result="revenue"]').textContent=contribution>0?money(revenue,c):'—';
 document.querySelector('[data-result="util"]').textContent=capacity>0&&contribution>0?(util*100).toFixed(1)+'%':'—';
}
function run(){
 if(document.body.dataset.metric==='profit') runProfit();
 if(document.body.dataset.metric==='break-even') runBreakEven();
}
document.querySelectorAll('input,select').forEach(x=>x.addEventListener('input',run));
document.querySelector('form')?.addEventListener('submit',e=>{e.preventDefault();run();track('business_metric_calculated');document.getElementById('results')?.scrollIntoView({behavior:'smooth',block:'start'});});
document.addEventListener('click',e=>{if(e.target.closest('[data-paid-cta]'))track('paid_cta_clicked')});
updateOffer();run();

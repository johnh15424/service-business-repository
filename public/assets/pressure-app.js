import {countries,provinces,currencies,jobs,reviewed} from './pressure-profiles.js';
import { mountCompactPaidCta } from './result-cta.js';
const $=id=>document.getElementById(id);
const form=$('pressure-calculator');
const fields=['area','crew','workHours','setupHours','travelHours','wage','burden','chemicals','utilities','wear','fuel','distance','vehicleRate','overhead','jobsMonth','fixedFee','fee','reserve','margin','minimum','taxRate'];
const stringFields=['country','province','currency','customCurrency','chargeTax','taxLabel','jobType'];
let current=null;let currency='EUR';
function track(event,placement){const detail={event,calculator:'pressure_washing',...(placement?{placement}:{})};try{window.dataLayer=window.dataLayer||[];window.dataLayer.push(detail);}catch{}try{window.dispatchEvent(new CustomEvent('calculator:conversion',{detail}));}catch{}}
for(const [code,[name]] of Object.entries(provinces)){const o=document.createElement('option');o.value=code;o.textContent=name;$('province').append(o)}
for(const code of currencies){const o=document.createElement('option');o.value=code;o.textContent=code;$('currency').append(o)}
const custom=document.createElement('option');custom.value='CUSTOM';custom.textContent='Other currency';$('currency').append(custom);
function money(n){return new Intl.NumberFormat('en',{style:'currency',currency,currencyDisplay:'code'}).format(n)}
function status(t){$('status').textContent=t}
function resultEl(key){return document.querySelector(`[data-result="${key}"]`)}
function contextual(){
 $('province-field').hidden=$('country').value!=='CA';
 $('custom-currency-field').hidden=$('currency').value!=='CUSTOM';
 $('taxRate').disabled=$('chargeTax').value!=='yes';
 const c=countries[$('country').value];$('tax-note').replaceChildren(document.createTextNode(c.note+' '));if(c.url){const a=document.createElement('a');a.href=c.url;a.textContent=c.source;$('tax-note').append(a)}$('tax-note').append(document.createTextNode(' Reference checked '+reviewed+'.'));
}
function setCountry(){const c=countries[$('country').value];$('currency').value=c.currency;$('taxRate').value=c.rate;$('taxLabel').value=c.tax;$('chargeTax').value='no';if($('country').value==='CA')setProvince();contextual();run();status('Country profile loaded. Tax remains off until enabled.')}
function setProvince(){const [,rate,label]=provinces[$('province').value];$('taxRate').value=rate;$('taxLabel').value=label}
function parse(id){const el=$(id),n=Number(el.value);if(!el.disabled&&(!el.value.trim()||!el.validity.valid||!Number.isFinite(n)))throw new Error(`${el.labels[0].textContent}: enter a valid number.`);return el.disabled?0:n}
function calculate(v){
 const labourHours=v.crew*v.workHours+v.setupHours+v.crew*v.travelHours;
 if(labourHours<=0)throw new Error('Enter some working time before calculating.');
 const loadedRate=v.wage*(1+v.burden/100);
 const labour=labourHours*loadedRate;
 const vehicle=v.distance*v.vehicleRate;
 const direct=labour+v.chemicals+v.utilities+v.wear+v.fuel+vehicle;
 if(v.jobsMonth<=0)throw new Error('Expected paid jobs must be greater than zero.');
 const allocatedOverhead=v.overhead/v.jobsMonth;
 const core=direct+allocatedOverhead+v.fixedFee;
 const taxRate=v.chargeTax?v.taxRate/100:0;
 const effectiveFee=v.fee/100*(1+taxRate);
 const denominator=1-v.margin/100-v.reserve/100-effectiveFee;
 if(denominator<=.000001)throw new Error('Margin + contingency + effective payment fees must total less than 100%.');
 const required=core/denominator;
 const preTax=Math.max(required,v.minimum);
 const tax=preTax*taxRate;
 const total=preTax+tax;
 const variableFee=total*v.fee/100;
 const reserve=preTax*v.reserve/100;
 const retained=preTax-direct-allocatedOverhead-v.fixedFee-variableFee-reserve;
 return {labourHours,loadedRate,labour,vehicle,direct,allocatedOverhead,core,required,preTax,tax,total,variableFee,reserve,retained,retainedMargin:preTax?retained/preTax*100:0,pricePerArea:v.area?preTax/v.area:null,minimumApplied:v.minimum>required};
}
function run(){
 contextual();$('errors').hidden=true;$('errors').textContent='';
 try{
  const v=Object.fromEntries(fields.map(k=>[k,parse(k)]));v.chargeTax=$('chargeTax').value==='yes';
  currency=$('currency').value==='CUSTOM'?$('customCurrency').value.trim().toUpperCase():$('currency').value;
  if(!/^[A-Z]{3}$/.test(currency))throw new Error('Enter a three-letter currency code.');
  new Intl.NumberFormat('en',{style:'currency',currency}).format(0);
  current={inputs:v,result:calculate(v)};
  const r=current.result;
  resultEl('hero').textContent=money(r.total);
  const map={labourHours:r.labourHours,direct:r.direct,overhead:r.allocatedOverhead,core:r.core,preTax:r.preTax,tax:r.tax,retained:r.retained};
  for(const [k,val] of Object.entries(map))resultEl(k).textContent=k==='labourHours'?val.toFixed(2):money(val);
  resultEl('margin').textContent=r.retainedMargin.toFixed(1)+'%';
  resultEl('pricePerArea').textContent=r.pricePerArea===null?'—':money(r.pricePerArea);
  $('tax-summary').textContent=v.chargeTax?`Includes ${money(r.tax)} ${$('taxLabel').value||'tax'} at ${v.taxRate}%.`:'Tax not charged on this estimate.';
  $('minimum-note').textContent=r.minimumApplied?'Your minimum charge sets this price.':'';
  $('quick-estimate').textContent='View estimate · '+money(r.total);
 }catch(e){current=null;$('errors').hidden=false;$('errors').textContent=e.message;document.querySelectorAll('[data-result]').forEach(el=>el.textContent='—');$('quick-estimate').textContent='Check inputs · estimate paused';}
}
function applyExample(){
 const j=jobs[$('jobType').value];
 const values={area:j.area,crew:j.crew,workHours:j.workHours,setupHours:j.setupHours,chemicals:j.chemicals,utilities:j.utilities,wear:j.wear,fuel:j.fuel,minimum:j.minimum};
 for(const [k,v] of Object.entries(values)){$(k).value=v;$(k).classList.remove('example-flash');void $(k).offsetWidth;$(k).classList.add('example-flash')}
 run();const btn=$('apply-example');const old=btn.textContent;btn.textContent='Example applied ✓';btn.classList.add('example-success');status('Example applied. Highlighted fields were updated; review them before quoting.');track('example_applied',$('jobType').value);setTimeout(()=>{btn.textContent=old;btn.classList.remove('example-success')},1800);
}
function enforcePaidFirst(){const paid=document.querySelector('[data-paid-cta="results"]')?.closest('.result-toolkit');const free=document.querySelector('[data-free-cta="results"]')?.closest('.result-toolkit');if(paid&&free&&paid!==free&&free.parentNode===paid.parentNode){free.parentNode.insertBefore(paid,free);const h=paid.querySelector('h3');if(h)h.textContent='Turn this estimate into a repeatable pressure-washing pricing system';const p=paid.querySelector('p');if(p)p.textContent='The €24.99 Pro Toolkit takes this model into reusable job costing, quote preparation, monthly planning and break-even analysis.';const fp=free.querySelector('p');if(fp)fp.textContent='Not ready for the full toolkit? Save the free checklist and keep using this calculator.';}}
let completionTracked=false;
function trackCompletion(){if(current&&!completionTracked){completionTracked=true;track('calculator_completed')}}
form.addEventListener('input',run);
form.addEventListener('change',e=>{if(e.target.id==='country')setCountry();else if(e.target.id==='province'){setProvince();run()}else run()});
form.addEventListener('submit',e=>{e.preventDefault();run();if(current)trackCompletion();$('estimate').focus();$('estimate').scrollIntoView({behavior:'smooth',block:'start'})});
$('apply-example').addEventListener('click',applyExample);
$('reset').addEventListener('click',()=>{form.reset();$('province').value='AB';setCountry();applyExample();status('Example inputs restored.')});
$('quick-estimate').addEventListener('click',()=>{trackCompletion();track('estimate_jump_clicked','mobile')});
enforcePaidFirst();
document.querySelectorAll('[data-free-cta]').forEach(link=>link.addEventListener('click',()=>track('free_checklist_clicked',link.dataset.freeCta)));
// Mount before the [data-paid-cta] scan below: querySelectorAll is not live, so the
// compact CTA must exist before the runtime registers its click tracking.
mountCompactPaidCta('pressure_washing');
document.querySelectorAll('[data-paid-cta]').forEach(link=>link.addEventListener('click',()=>track('paid_cta_clicked',link.dataset.paidCta)));
track('calculator_viewed');
setCountry();applyExample();

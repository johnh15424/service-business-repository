import {calculate,numericKeys} from './pricing.js';
import {countries,provinces,services,example,reviewed} from './profiles.js';
const $=id=>document.getElementById(id);
const form=$('calculator');
const canonical=document.querySelector('link[rel="canonical"]');
if(canonical)canonical.href='https://servicepricingtools.com/dog-grooming-price-calculator/';
const ogUrl=document.querySelector('meta[property="og:url"]');
if(ogUrl)ogUrl.content='https://servicepricingtools.com/dog-grooming-price-calculator/';
document.querySelectorAll('.brand').forEach(el=>{
 const img=el.querySelector('img');
 el.replaceChildren();
 if(img)el.append(img);
 el.append(document.createTextNode('Service Pricing '));
 const span=document.createElement('span');span.textContent='Tools';el.append(span);
});
// Provider-neutral hooks only: no cookies, personal data or network requests.
function track(event, placement){
 const detail={event,calculator:'dog_grooming',...(placement?{placement}:{})};
 try{window.dataLayer=window.dataLayer||[];window.dataLayer.push(detail);}catch{}
 try{window.dispatchEvent(new CustomEvent('calculator:conversion',{detail}));}catch{}
}
let completionTracked=false;
function trackCompletion(){if(current&&!completionTracked){completionTracked=true;track('calculator_completed');}}
const storeKey='grooming-calculator-v3';
const stringKeys=['country','currency','customCurrency','province','chargeTax','taxLabel','service','size','coat','condition','mobile','feeBasis'];
let current=null;
let currency='EUR';
let statusTimer;
for(const [key,[name]] of Object.entries(provinces)){
 const option=document.createElement('option');option.value=key;option.textContent=name;$('province').append(option);
}
function status(text){$('status').textContent=text;}
function raw(){return Object.fromEntries([...numericKeys,...stringKeys].map(k=>[k,$(k).value]));}
function money(n){return new Intl.NumberFormat('en-IE',{style:'currency',currency,currencyDisplay:'code'}).format(n);}
function contextual(){
 $('province-field').hidden=$('country').value!=='CA';
 $('custom-currency-field').hidden=$('currency').value!=='CUSTOM';
 $('travel-fields').hidden=$('mobile').value!=='yes';
 ['distance','vehicleRate','travelMinutes'].forEach(k=>$(k).disabled=$('mobile').value!=='yes');
 $('taxRate').disabled=$('chargeTax').value!=='yes';
 $('coat-warning').hidden=$('condition').value!=='matted';
 $('service-note').textContent=services[$('service').value].note;
 const c=countries[$('country').value];
 $('tax-note').replaceChildren(document.createTextNode(c.note+' '));
 if(c.url){const a=document.createElement('a');a.href=c.url;a.textContent=c.source;$('tax-note').append(a);}
 $('tax-note').append(document.createTextNode(' Reference checked '+reviewed+'.'));
}
function setCountry(){
 const c=countries[$('country').value];
 $('currency').value=c.currency;$('taxRate').value=c.rate;$('taxLabel').value=c.tax;$('chargeTax').value='no';
 if($('country').value==='CA')setProvince();
 status('Country updated. Tax is off until you choose to charge it. Currency labels changed; cost amounts have not been converted.');
}
function setProvince(){const [,rate,label]=provinces[$('province').value];$('taxRate').value=rate;$('taxLabel').value=label;}
function errors(messages){
 const box=$('errors');box.hidden=!messages.length;box.replaceChildren();
 if(!messages.length)return;
 const strong=document.createElement('strong');strong.textContent='Check these inputs';box.append(strong);
 const ul=document.createElement('ul');messages.forEach(message=>{const li=document.createElement('li');li.textContent=message;ul.append(li);});box.append(ul);
}
function run(){
 contextual();
 current=null;
 const v={};const messages=[];
 form.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
 for(const k of numericKeys){
  const el=$(k);
  // Disabled tax/travel fields cannot invalidate a salon or untaxed quote.
  v[k]=el.disabled?0:Number(el.value);
  if(!el.disabled && (!el.value.trim()||!el.validity.valid||!Number.isFinite(v[k]))){
   el.setAttribute('aria-invalid','true');messages.push(`${el.labels[0].textContent}: enter a valid number from ${el.min} to ${el.max}.`);
  }
 }
 v.chargeTax=$('chargeTax').value==='yes';v.mobile=$('mobile').value==='yes';v.feeBasis=$('feeBasis').value;
 currency=$('currency').value==='CUSTOM'?$('customCurrency').value.trim().toUpperCase():$('currency').value;
 if(!/^[A-Z]{3}$/.test(currency)){
  messages.push('Enter a three-letter currency code.');$('customCurrency').setAttribute('aria-invalid','true');
 }else{try{
  if(typeof Intl.supportedValuesOf==='function' && !Intl.supportedValuesOf('currency').includes(currency))throw new Error();
  v.currencyDigits=new Intl.NumberFormat('en',{style:'currency',currency}).resolvedOptions().maximumFractionDigits;
  money(0);
 }catch{messages.push('Enter a recognised ISO currency code.');$('customCurrency').setAttribute('aria-invalid','true');}}
 if(!messages.length){try{current={inputs:v,result:calculate(v)};}catch(e){messages.push(e.message);}}
 errors(messages);
 $('quick-estimate').textContent=current?'View estimate · '+money(current.result.total):'Check inputs · estimate paused';
 $('download').disabled=!current;$('save').disabled=!current;
 if(!current){
  document.querySelectorAll('[data-result]').forEach(el=>el.textContent='—');
  $('tax-summary').textContent='Estimate paused until the inputs are valid.';$('duration').textContent='Check inputs';$('warnings').replaceChildren();return;
 }
 const r=current.result;
 document.querySelectorAll('[data-result]').forEach(el=>{
  const k=el.dataset.result;const value=k==='hero'?r.total:(Object.hasOwn(r,k)?r[k]:v[k]);
  el.textContent=['grossMargin','retainedMargin','markup'].includes(k)?(value===null?'Not applicable':value.toFixed(1)+'%'):money(value);
 });
 const taxLabel=$('taxLabel').value.trim()||'Tax';
 $('tax-summary').textContent=v.chargeTax?`Includes ${money(r.tax)} ${taxLabel} at ${v.taxRate}%.`:'Tax not charged on this estimate.';
 $('duration').textContent=`${r.totalMinutes.toFixed(r.totalMinutes%1?1:0)} working minutes`;
 $('service-summary').textContent=`${services[$('service').value].name} · ${$('size').selectedOptions[0].textContent}`;
 const notices=[];
 if(r.preTax>10000)notices.push('This is a very large single-appointment price. Check currency, units, costs and percentages before using it.');
 if(r.minimumApplied)notices.push('Your minimum charge sets this price, so the retained margin is above your target.');
 if(r.denominator<.1)notices.push('Less than 10% of revenue is left to cover the cost base. This combination produces a very high price; review your target and fees.');
 if(v.wage===0)notices.push('Labour is zero. Include the value of your own time to avoid understating cost.');
 if(r.core===0)notices.push('No costs are entered. A zero-cost estimate is not a sustainable pricing assumption.');
 if(v.labourFactor>1)notices.push(`Grooming labour has a ${v.labourFactor.toFixed(2)}× intensity adjustment. Check you have not already included this in extra time.`);
 if(v.chargeTax&&['US','OTHER'].includes($('country').value)&&v.taxRate===0)notices.push('The manual tax rate is zero. Confirm this is correct for this sale; it is not an automatic exemption.');
 if($('country').value==='CA'&&['BC','MB','SK','QC'].includes($('province').value))notices.push('This province profile includes federal GST only. Verify any additional provincial tax before quoting.');
 if(r.totalMinutes>480)notices.push('This estimate exceeds eight person-hours. Check time entries and the appointment scope.');
 $('warnings').replaceChildren(...notices.map(text=>{const p=document.createElement('p');p.textContent=text;return p;}));
}
form.addEventListener('input',()=>{run();clearTimeout(statusTimer);statusTimer=setTimeout(()=>status(current?'Estimate updated. Changes are not saved until you choose Save settings.':'Estimate paused. Check the highlighted inputs.'),650);});
form.addEventListener('change',e=>{
 clearTimeout(statusTimer);
 if(['service','size','coat','condition'].includes(e.target.id))$('example-reminder').hidden=false;
 if(e.target.id==='country')setCountry();
 if(e.target.id==='province'){setProvince();status('Province tax reference updated. Check any additional provincial tax.');}
 if(e.target.id==='currency')status('Currency labels updated only. Cost amounts have not been converted.');
 run();
});
form.addEventListener('submit',e=>{e.preventDefault();run();if(!current){const bad=form.querySelector('[aria-invalid=true]');if(bad){bad.closest('details').open=true;bad.focus();}else $('estimate').focus();}else{trackCompletion();$('estimate').focus();$('estimate').scrollIntoView({behavior:'smooth',block:'start'});}});
$('apply-example').addEventListener('click',()=>{
 Object.entries(example($('service').value,Number($('size').value),$('coat').value,$('condition').value)).forEach(([k,v])=>$(k).value=v);
 $('example-reminder').hidden=true;
 run();status('Groom example applied. Base time, coat time, products, wear and minimum were replaced. Review them before quoting.');
});
$('reset').addEventListener('click',()=>{form.reset();$('province').value='AB';run();status('Example inputs restored. Saved settings are unchanged; use Clear saved settings to remove them.');});
$('save').addEventListener('click',()=>{run();if(!current)return;try{localStorage.setItem(storeKey,JSON.stringify({version:3,values:raw()}));status('Settings saved in this browser on this device.');}catch{status('This browser could not save settings. You can still download your estimate.');}});
$('clear').addEventListener('click',()=>{try{localStorage.removeItem(storeKey);status('Saved settings removed. Current inputs are unchanged.');}catch{status('Browser storage is unavailable.');}});
$('download').addEventListener('click',()=>{
 run();if(!current)return;
 const payload={tool:'Dog Grooming Price Calculator',version:'3.0',createdAt:new Date().toISOString(),currency,settings:raw(),inputs:current.inputs,results:current.result,note:'Planning estimate; example defaults are not market prices. Profit after overhead excludes income/corporation tax and omitted costs.'};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='dog-grooming-estimate.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Estimate download requested. It includes your settings and cost breakdown.');
});
try{
 const saved=JSON.parse(localStorage.getItem(storeKey)||'null');
 if(saved?.version===3 && saved.values && typeof saved.values==='object'){
  for(const k of [...numericKeys,...stringKeys]){
   const el=$(k);const value=saved.values[k];
   if(typeof value!=='string'||value.length>100)continue;
   if(el.tagName==='SELECT' && !Array.from(el.options).some(o=>o.value===value))continue;
   el.value=value;
  }
  status('Your saved settings were restored from this browser. Review the current tax rate before quoting.');
 }
}catch{status('Saved settings could not be restored. The example inputs are ready to edit.');}
run();

track('calculator_viewed');
$('quick-estimate').addEventListener('click',trackCompletion);
document.querySelectorAll('[data-paid-cta]').forEach(link=>link.addEventListener('click',()=>track('paid_cta_clicked',link.dataset.paidCta)));

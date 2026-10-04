import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
import {calculate,numericKeys} from '../public/assets/pricing.js';
import {countries,provinces,services,example,reviewed} from '../public/assets/profiles.js';
const html=readFileSync(new URL('../public/dog-grooming-price-calculator/index.html',import.meta.url),'utf8');
const source=readFileSync(new URL('../public/assets/app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
function setup(t){
 const errors=[];const console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e));
 const dom=new JSDOM(html,{url:'https://calculator.test/',runScripts:'outside-only',virtualConsole:console});
 // app.js is eval'd after imports are stripped. The compact CTA module has its own focused
 // regression coverage, so this legacy UI harness supplies the imported symbol without trying
 // to reimplement or duplicate the module inside jsdom.
 const mountCompactPaidCta=()=>null;
 Object.assign(dom.window,{calculate,numericKeys,countries,provinces,services,example,reviewed,mountCompactPaidCta});
 dom.window.eval(source);const $=id=>dom.window.document.getElementById(id);
 const set=(id,value)=>{$(id).value=String(value);$(id).dispatchEvent(new dom.window.Event('change',{bubbles:true}));};
 const result=key=>dom.window.document.querySelector(`[data-result="${key}"]`).textContent;
 t.after(()=>{dom.window.close();assert.deepEqual(errors,[],'No application exceptions');});
 return {$,set,result,dom};
}
test('zero-cost UI displays N/A markup without crashing, and saves',t=>{
 const {set,result,$}=setup(t);
 for(const k of ['wage','shampoo','conditioner','specialist','wear','utilities','overhead','fixedFee','minimum'])set(k,0);
 assert.equal(result('markup'),'Not applicable');assert.match(result('hero'),/0\.00/);assert.equal($('save').disabled,false);
 $('save').click();assert.match($('status').textContent,/saved/);
});
test('country changes default to no tax; registration opt-in and manual rates work',t=>{
 const {set,result,$}=setup(t);
 for(const [country,rate,code] of [['IE',23,'EUR'],['GB',20,'GBP'],['AU',10,'AUD'],['CA',5,'CAD'],['US',0,'USD']]){
  set('country',country);assert.equal($('taxRate').value,String(rate));assert.equal($('chargeTax').value,'no');assert.match(result('tax'),/0\.00/);assert.ok(result('hero').includes(code));
  set('chargeTax','yes');set('taxRate',7.5);assert.notEqual(result('tax'),`${code} 0.00`);assert.equal($('taxRate').disabled,false);
 }
 set('country','CA');set('province','NS');assert.equal($('taxRate').value,'14');set('province','ON');assert.equal($('taxRate').value,'13');
});
test('invalid numbers and percentage combinations pause results and recover',t=>{
 const {set,result,$}=setup(t);
 for(const [id,value] of [['wage',-1],['appointments',0],['margin',98],['wage',1e9]]){
  set(id,value);assert.equal(result('hero'),'—');assert.equal($('download').disabled,true);assert.match($('quick-estimate').textContent,/paused/);$('reset').click();assert.notEqual(result('hero'),'—');
 }
});
test('mobile travel is included only in mobile mode',t=>{
 const {set,result,$}=setup(t);const original=result('hero');
 set('distance',40);set('travelMinutes',60);assert.equal(result('hero'),original);
 set('mobile','yes');assert.notEqual(result('hero'),original);assert.equal($('travel-fields').hidden,false);
 set('mobile','no');assert.equal(result('hero'),original);
});
test('service examples require explicit application and give visible confirmation',t=>{
 const {set,$,dom}=setup(t);set('service','nails');assert.equal($('example-reminder').hidden,false);assert.equal($('baseMinutes').value,'105');
 $('apply-example').click();assert.equal($('baseMinutes').value,'15');assert.equal($('coatMinutes').value,'0');assert.equal($('example-reminder').hidden,true);
 assert.match($('apply-example').textContent,/Example applied/);assert.match($('status').textContent,/estimate recalculated/);
 assert.equal(dom.window.dataLayer.filter(e=>e.event==='example_applied').length,1);
});
test('custom currency uses ISO decimal precision and rejects unknown codes',t=>{
 const {set,result}=setup(t);set('currency','CUSTOM');set('customCurrency','JPY');assert.match(result('hero'),/JPY/);assert.doesNotMatch(result('hero'),/\.\d/);
 set('customCurrency','KWD');assert.match(result('hero'),/\.\d{3}$/);set('customCurrency','ZZZ');assert.equal(result('hero'),'—');
});
test('HTML assets, internal paths and fragment links all resolve',()=>{
 const root=new URL('../public/',import.meta.url);
 for(const path of ['index.html','dog-grooming-price-calculator/index.html','grooming-pricing-guide/index.html']){
  const page=new JSDOM(readFileSync(new URL(path,root),'utf8'));const doc=page.window.document;
  assert.equal(doc.querySelectorAll('h1').length,1);
  for(const node of doc.querySelectorAll('[href],[src]')){
   const target=node.getAttribute('href')||node.getAttribute('src');
   if(!target.startsWith('/')&&!target.startsWith('#'))continue;
   const [pathname,fragment]=target.split('#');
   const file=pathname?(pathname.endsWith('/')?pathname.slice(1)+'index.html':pathname.slice(1)):path;
   const content=readFileSync(new URL(file,root),'utf8');
   if(fragment){const other=new JSDOM(content);assert.ok(other.window.document.getElementById(fragment),`${path}: ${target}`);other.window.close();}
  }
  page.window.close();
 }
});
test('conversion hooks count valid completion once and identify paid CTA placement',t=>{
 const {dom,$,set}=setup(t);const events=dom.window.dataLayer;
 assert.equal(events.length,1);assert.equal(events[0].event,'calculator_viewed');
 set('wage',-1);$('quick-estimate').dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,cancelable:true}));assert.equal(events.length,1);
 set('wage',18);$('quick-estimate').dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,cancelable:true}));$('quick-estimate').dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,cancelable:true}));
 assert.equal(events.filter(e=>e.event==='calculator_completed').length,1);
 for(const link of dom.window.document.querySelectorAll('[data-paid-cta]')){
  link.addEventListener('click',e=>e.preventDefault());link.click();
 }
 assert.deepEqual(Array.from(events.filter(e=>e.event==='paid_cta_clicked'),e=>e.placement),['results','bottom']);
 assert.ok(events.every(e=>Object.keys(e).every(k=>['event','calculator','placement'].includes(k))));
});
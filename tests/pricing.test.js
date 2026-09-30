import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculate,numericKeys} from '../public/assets/pricing.js';
import {example,countries,provinces} from '../public/assets/profiles.js';
const base=()=>({...Object.fromEntries(numericKeys.map(k=>[k,0])),baseMinutes:60,wage:60,appointments:1,labourFactor:1,margin:40,chargeTax:false,mobile:false,feeBasis:'total'});
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('margin is not markup: 60 cost requires 100 at 40%',()=>{const r=calculate(base());near(r.preTax,100);near(r.retained,40);near(r.retainedMargin,40);near(r.markup,66.66666666666667);});
test('40% markup is only 28.57% margin',()=>{const v=base();v.margin=0;v.minimum=84;near(calculate(v).retainedMargin,28.5714285714,.00001);});
test('fees on tax-inclusive amount are funded without treating tax as profit',()=>{const v={...base(),fee:2,reserve:3,chargeTax:true,taxRate:23};const r=calculate(v);near(r.preTax,110.02);near(r.tax,25.30);near(r.total,135.32);near(r.variableFee,2.7064);assert.ok(r.retainedMargin>=39.999);near(r.retained,r.preTax-r.core-r.variableFee-r.reserve);});
test('pre-tax fee basis differs from tax-inclusive basis',()=>{const v={...base(),fee:2,reserve:3,chargeTax:true,taxRate:23,feeBasis:'pretax'};const r=calculate(v);near(r.preTax,109.10);near(r.variableFee,2.182);assert.ok(calculate({...v,feeBasis:'total'}).preTax>r.preTax);});
test('tax off ignores rate in calculation',()=>{const v={...base(),taxRate:23};const r=calculate(v);near(r.tax,0);near(r.total,100);});
test('minimum price overrides calculated price and margin rises',()=>{const r=calculate({...base(),minimum:150});near(r.preTax,150);assert.equal(r.minimumApplied,true);near(r.retainedMargin,60);});
test('zero margin breaks even after fees and reserve',()=>{const r=calculate({...base(),margin:0,fee:2,reserve:3,fixedFee:.3});assert.ok(r.retained>=-0.0001&&r.retained<.01);});
test('high but feasible margin remains mathematically correct',()=>{const r=calculate({...base(),margin:95});near(r.preTax,1200);near(r.retainedMargin,95);});
test('invalid combined percentages are rejected',()=>{assert.throws(()=>calculate({...base(),margin:95,fee:2,reserve:3}),/less than 100/);assert.throws(()=>calculate({...base(),margin:96,fee:3.5,chargeTax:true,taxRate:23}),/less than 100/);});
test('100% margin and negative / NaN / Infinity inputs fail',()=>{assert.throws(()=>calculate({...base(),margin:100}));for(const value of [-1,NaN,Infinity])assert.throws(()=>calculate({...base(),wage:value}));});
test('zero paid appointments and zero total time fail',()=>{assert.throws(()=>calculate({...base(),appointments:0}));assert.throws(()=>calculate({...base(),baseMinutes:0}));});
test('mobile travel labour and vehicle cost count once; salon ignores both',()=>{const v={...base(),margin:0,mobile:true,distance:20,vehicleRate:.5,travelMinutes:30,labourFactor:1.1,burden:10};const r=calculate(v);near(r.labour,72.6);near(r.travelLabour,33);near(r.vehicle,10);near(r.preTax,115.6);const salon=calculate({...v,mobile:false});near(salon.travelLabour,0);near(salon.vehicle,0);near(salon.totalMinutes,60);});
test('gross profit excludes overhead; retained profit deducts it',()=>{const r=calculate({...base(),overhead:200,appointments:10});near(r.overhead,20);near(r.grossProfit,r.preTax-60);near(r.retained,r.grossProfit-20);assert.ok(r.grossMargin>r.retainedMargin);});
test('workbook sample can be reconciled with explicit legacy options',()=>{const v={...base(),baseMinutes:105,coatMinutes:15,wage:18,burden:12,labourFactor:1.1,shampoo:2.6,conditioner:1.63,specialist:2.27,wear:3,utilities:2.5,overhead:2200,appointments:120,fixedFee:.3,fee:2,reserve:3,minimum:70,feeBasis:'pretax'};const r=calculate(v);near(r.core,74.98533333333334);near(r.required,136.33696969696973);near(r.preTax,136.34);near((r.retained+r.reserve)/r.preTax*100,43.0013,.001);});
test('all-zero costs with positive time gives finite zero outputs',()=>{const r=calculate({...base(),wage:0});near(r.preTax,0);near(r.grossMargin,0);assert.equal(r.markup,null);});
test('service and size examples differ; nails do not carry coat time',()=>{assert.ok(example('full',2,'curly','tangled').baseMinutes>example('full',0,'short','maintained').baseMinutes);near(example('nails',1,'double','matted').coatMinutes,0);near(example('full',1,'curly','maintained').shampoo+example('full',1,'curly','maintained').conditioner+example('full',1,'curly','maintained').specialist,6.5);});
test('country/province defaults include current Nova Scotia and manual US rate',()=>{near(countries.IE.rate,23);near(countries.GB.rate,20);near(countries.AU.rate,10);near(countries.US.rate,0);near(provinces.NS[1],14);near(provinces.ON[1],13);});
test('cent rounding never underprices the continuous recommendation',()=>{for(const taxRate of [0,5,13,14,20,23])for(const margin of [0,20,40,70]){const r=calculate({...base(),wage:18.37,margin,fee:2.9,fixedFee:.3,reserve:3,taxRate,chargeTax:true});assert.ok(r.preTax>=r.required-1e-8);assert.ok(r.retainedMargin>=margin-.001);near(r.total,r.preTax+r.tax);}});
test('currency rounding funds fees on rounded tax even for very small quotes',()=>{
 for(const currencyDigits of [0,2,3])for(const wage of [.01,.03,.17,1.23,18.37])for(const taxRate of [5,14,23])for(const fee of [2.9,40]){
  const r=calculate({...base(),currencyDigits,wage,fee,taxRate,chargeTax:true,margin:0});
  assert.ok(r.retained>=-1e-8,JSON.stringify({currencyDigits,wage,taxRate,fee,r}));
 }
});
test('extreme finite values fail before misleading quotes are returned',()=>{
 assert.throws(()=>calculate({...base(),wage:1e9,baseMinutes:1e9}),/one billion/);
 assert.throws(()=>calculate({...base(),overhead:1e9,appointments:.000001}),/one billion/);
 assert.throws(()=>calculate({...base(),currencyDigits:100}),/precision/);
});

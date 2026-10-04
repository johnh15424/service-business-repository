import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {calculateServicePrice} from '../public/assets/pricing-engine.js';

const publicDir='public';
const read=p=>readFileSync(p,'utf8');
const factoryPages=readdirSync(publicDir,{withFileTypes:true})
  .filter(entry=>entry.isDirectory()&&entry.name.endsWith('-price-calculator'))
  .map(entry=>join(publicDir,entry.name,'index.html'))
  .filter(path=>existsSync(path)&&read(path).includes('id="factory-root"'));

function configFrom(html,path){
  const match=html.match(/<script id="niche-config" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(match,`${path}: missing niche-config JSON`);
  return JSON.parse(match[1]);
}

function finiteNonNegative(value,label){
  assert.equal(typeof value,'number',`${label}: expected number`);
  assert.ok(Number.isFinite(value),`${label}: expected finite number`);
  assert.ok(value>=0,`${label}: expected zero or more`);
}

test('factory calculator pages have valid crawlable metadata and unique configs',()=>{
  assert.ok(factoryPages.length>=10,'expected factory calculator pages');
  const ids=new Set();
  const canonicals=new Set();
  for(const path of factoryPages){
    const html=read(path);
    const config=configFrom(html,path);
    assert.ok(config.id,`${path}: missing config id`);
    assert.ok(!ids.has(config.id),`${path}: duplicate config id ${config.id}`);
    ids.add(config.id);
    assert.match(html,/<title>[^<]{20,}<\/title>/,`${path}: weak/missing title`);
    assert.match(html,/<meta name="description" content="[^"]{60,}"/,`${path}: weak/missing description`);
    assert.match(html,/<h1>/,`${path}: missing h1`);
    const canonical=html.match(/<link rel="canonical" href="([^"]+)"/);
    assert.ok(canonical,`${path}: missing canonical`);
    assert.ok(!canonicals.has(canonical[1]),`${path}: duplicate canonical`);
    canonicals.add(canonical[1]);
    assert.match(html,/factory-calculator\.js/,`${path}: not using shared factory runtime`);
  }
});

test('factory configs have safe inputs and economically valid examples',()=>{
  for(const path of factoryPages){
    const config=configFrom(read(path),path);
    const d=config.defaults;
    assert.ok(d,`${config.id}: missing defaults`);
    for(const key of ['crew','workHours','travelHours','wage','burden','distance','vehicleRate','monthlyOverhead','jobsMonth','fixedFee','paymentFeeRate','reserveRate','targetMargin','minimumPreTax','taxRate']) finiteNonNegative(d[key],`${config.id}.${key}`);
    assert.ok(d.crew>=1,`${config.id}: crew must be at least 1`);
    assert.ok(d.jobsMonth>0,`${config.id}: jobsMonth must be greater than zero`);
    assert.ok(d.paymentFeeRate<100&&d.reserveRate<100&&d.targetMargin<100,`${config.id}: rates must be below 100`);
    assert.ok(d.paymentFeeRate+d.reserveRate+d.targetMargin<100,`${config.id}: fee + reserve + margin must stay below 100`);

    assert.ok(Array.isArray(config.directCostFields)&&config.directCostFields.length>0,`${config.id}: missing direct cost fields`);
    const directIds=new Set();
    for(const field of config.directCostFields){
      assert.ok(field.id&&field.label,`${config.id}: every direct cost field needs id and label`);
      assert.ok(!directIds.has(field.id),`${config.id}: duplicate direct cost field ${field.id}`);
      directIds.add(field.id);
      finiteNonNegative(field.default,`${config.id}.${field.id}.default`);
    }

    assert.ok(Array.isArray(config.jobTypes)&&config.jobTypes.length>=4,`${config.id}: expected at least four job examples`);
    for(const job of config.jobTypes){
      assert.ok(job.id&&job.label,`${config.id}: job examples need id and label`);
      const e={...d,...job.example};
      finiteNonNegative(e.crew,`${config.id}.${job.id}.crew`);
      finiteNonNegative(e.workHours,`${config.id}.${job.id}.workHours`);
      finiteNonNegative(e.travelHours,`${config.id}.${job.id}.travelHours`);
      assert.ok(e.crew>=1,`${config.id}.${job.id}: crew must be at least 1`);
      assert.ok(e.workHours+e.travelHours>0,`${config.id}.${job.id}: example needs paid time`);
      const directCosts=config.directCostFields.reduce((sum,field)=>{
        const value=job.example?.[field.id] ?? field.default;
        finiteNonNegative(value,`${config.id}.${job.id}.${field.id}`);
        return sum+value;
      },0);
      const minimum=job.example?.minimum ?? job.example?.minimumPreTax ?? d.minimumPreTax;
      finiteNonNegative(minimum,`${config.id}.${job.id}.minimum`);
      const labourHours=e.crew*(e.workHours+e.travelHours);
      const result=calculateServicePrice({
        labourCost:labourHours*d.wage*(1+d.burden/100),
        directCosts,
        travelCost:d.distance*d.vehicleRate,
        allocatedOverhead:d.monthlyOverhead/d.jobsMonth,
        fixedFee:d.fixedFee,
        paymentFeeRate:d.paymentFeeRate,
        reserveRate:d.reserveRate,
        targetMargin:d.targetMargin,
        minimumPreTax:minimum,
        taxRate:0,
        chargeTax:false,
        feeBasis:'total'
      });
      assert.ok(Number.isFinite(result.preTax)&&result.preTax>0,`${config.id}.${job.id}: invalid price`);
      assert.ok(result.retainedMargin+1e-6>=d.targetMargin,`${config.id}.${job.id}: target margin not protected`);
    }
  }
});

test('build niches stay out of live navigation until products are wired',async()=>{
  const {nicheRegistry}=await import('../public/assets/niche-registry.js');
  const build=nicheRegistry.filter(n=>n.status==='build');
  assert.ok(build.length>0,'expected at least one build-stage niche');
  for(const niche of build){
    assert.equal(niche.freeUrl,null,`${niche.id}: free URL should stay null before Payhip setup`);
    assert.equal(niche.proUrl,null,`${niche.id}: pro URL should stay null before Payhip setup`);
    assert.equal(niche.proPrice,24.99,`${niche.id}: unexpected launch price`);
  }
});

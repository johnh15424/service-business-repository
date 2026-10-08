import { test } from 'node:test';
import assert from 'node:assert/strict';
import config from '../factory/niches/commercial-cleaning.js';
import { calculateServicePrice } from '../public/assets/pricing-engine.js';

test('commercial cleaning remains build-stage without invented checkout links', () => {
  assert.equal(config.status, 'build');
  assert.equal(config.products.freeUrl, null);
  assert.equal(config.products.proUrl, null);
  assert.equal(config.products.proPrice, 24.99);
  assert.ok(config.jobTypes.length >= 5);
});

test('commercial cleaning visit examples preserve retained margin', () => {
  const d = config.defaults;
  const ids = new Set();
  for (const job of config.jobTypes) {
    assert.ok(!ids.has(job.id), 'duplicate job example');
    ids.add(job.id);
    const e = {...d, ...job.example};
    const directCosts = config.directCostFields.reduce((sum, field) => sum + (e[field.id] ?? field.default), 0);
    const labourCost = e.crew * (e.workHours + e.travelHours) * d.wage * (1 + d.burden / 100);
    const result = calculateServicePrice({
      labourCost, directCosts, travelCost: d.distance * d.vehicleRate,
      allocatedOverhead: d.monthlyOverhead / d.jobsMonth,
      fixedFee: d.fixedFee, paymentFeeRate: d.paymentFeeRate,
      reserveRate: d.reserveRate, targetMargin: d.targetMargin,
      minimumPreTax: e.minimumPreTax, taxRate: 0,
      chargeTax: false, feeBasis: 'total'
    });
    assert.ok(Number.isFinite(result.preTax) && result.preTax > 0, job.id);
    assert.ok(result.retainedMargin + 1e-6 >= d.targetMargin, job.id);
  }
});

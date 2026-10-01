import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateServicePrice } from '../public/assets/pricing-engine.js';

test('shared engine hits target retained margin without tax', () => {
  const r = calculateServicePrice({
    labourCost: 60,
    directCosts: 20,
    travelCost: 10,
    allocatedOverhead: 10,
    fixedFee: 0,
    paymentFeeRate: 0,
    reserveRate: 0,
    targetMargin: 20,
    minimumPreTax: 0,
    taxRate: 0,
    chargeTax: false
  });
  assert.equal(r.preTax, 125);
  assert.equal(r.retainedProfit, 25);
  assert.equal(r.retainedMargin, 20);
});

test('minimum charge overrides calculated requirement', () => {
  const r = calculateServicePrice({
    labourCost: 20,
    directCosts: 5,
    travelCost: 0,
    allocatedOverhead: 5,
    targetMargin: 20,
    minimumPreTax: 75
  });
  assert.equal(r.preTax, 75);
  assert.equal(r.minimumApplied, true);
});

test('tax is added after the pre-tax selling price', () => {
  const r = calculateServicePrice({
    labourCost: 50,
    directCosts: 10,
    travelCost: 0,
    allocatedOverhead: 10,
    targetMargin: 30,
    taxRate: 20,
    chargeTax: true
  });
  assert.equal(r.tax, Math.round(r.preTax * .20 * 100) / 100);
  assert.equal(r.total, r.preTax + r.tax);
});

test('fees on tax-inclusive total are included in the denominator', () => {
  const r = calculateServicePrice({
    labourCost: 60,
    directCosts: 20,
    travelCost: 5,
    allocatedOverhead: 15,
    paymentFeeRate: 3,
    reserveRate: 2,
    targetMargin: 25,
    taxRate: 20,
    chargeTax: true,
    feeBasis: 'total'
  });
  assert.ok(r.retainedMargin >= 25 - 0.01);
});

test('invalid combined percentages are rejected', () => {
  assert.throws(() => calculateServicePrice({
    labourCost: 10,
    targetMargin: 80,
    reserveRate: 15,
    paymentFeeRate: 10
  }), /less than 100%/);
});

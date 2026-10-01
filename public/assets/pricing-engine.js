/**
 * Shared currency-neutral pricing engine for Service Pricing Tools.
 *
 * All percentage inputs use decimal percentages (e.g. 2.5 means 2.5%).
 * No niche terminology, country defaults, tax rules or DOM access belongs here.
 */
export function calculateServicePrice(input) {
  const v = {
    labourCost: 0,
    directCosts: 0,
    travelCost: 0,
    allocatedOverhead: 0,
    fixedFee: 0,
    paymentFeeRate: 0,
    reserveRate: 0,
    targetMargin: 0,
    minimumPreTax: 0,
    taxRate: 0,
    chargeTax: false,
    feeBasis: 'total',
    currencyDigits: 2,
    ...input
  };

  const numeric = [
    'labourCost','directCosts','travelCost','allocatedOverhead','fixedFee',
    'paymentFeeRate','reserveRate','targetMargin','minimumPreTax','taxRate'
  ];
  for (const key of numeric) {
    const value = v[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new Error(`${key}: enter a finite number of zero or more.`);
    }
  }

  if (v.paymentFeeRate >= 100 || v.reserveRate >= 100 || v.targetMargin >= 100) {
    throw new Error('Margin, payment fees and contingency must each be below 100%.');
  }
  if (v.taxRate > 100) throw new Error('Tax rate cannot exceed 100%.');
  if (!['total','preTax'].includes(v.feeBasis)) throw new Error('feeBasis must be total or preTax.');
  if (![0,1,2,3,4].includes(v.currencyDigits)) throw new Error('Unsupported currency precision.');

  const taxRate = v.chargeTax ? v.taxRate / 100 : 0;
  const feeRate = v.paymentFeeRate / 100;
  const reserveRate = v.reserveRate / 100;
  const marginRate = v.targetMargin / 100;
  const effectiveFeeRate = feeRate * (v.feeBasis === 'total' ? 1 + taxRate : 1);
  const denominator = 1 - marginRate - reserveRate - effectiveFeeRate;
  if (denominator <= 0.000001) {
    throw new Error('Margin + contingency + effective payment fees must total less than 100%.');
  }

  const coreCost = v.labourCost + v.directCosts + v.travelCost + v.allocatedOverhead + v.fixedFee;
  const requiredPreTax = coreCost / denominator;
  const scale = 10 ** v.currencyDigits;
  let preTax = Math.ceil(Math.max(requiredPreTax, v.minimumPreTax) * scale - 1e-7) / scale;
  const round = n => Math.round((n + Number.EPSILON) * scale) / scale;

  // Compensate for tax rounding when payment fees are charged on the tax-inclusive total.
  for (let i = 0; i < 12; i++) {
    const tax = round(preTax * taxRate);
    const paymentFee = (v.feeBasis === 'total' ? preTax + tax : preTax) * feeRate;
    const reserve = preTax * reserveRate;
    const retained = preTax - coreCost - paymentFee - reserve;
    const requiredRetained = preTax * marginRate;
    const shortfall = requiredRetained - retained;
    if (shortfall <= 1e-9) break;
    preTax += Math.max(1, Math.ceil((shortfall / denominator) * scale)) / scale;
  }

  const tax = round(preTax * taxRate);
  const total = preTax + tax;
  const paymentFee = (v.feeBasis === 'total' ? total : preTax) * feeRate;
  const reserve = preTax * reserveRate;
  const retainedProfit = preTax - coreCost - paymentFee - reserve;

  return {
    coreCost,
    requiredPreTax,
    preTax,
    tax,
    total,
    paymentFee,
    reserve,
    retainedProfit,
    retainedMargin: preTax ? retainedProfit / preTax * 100 : 0,
    minimumApplied: v.minimumPreTax > requiredPreTax,
    denominator,
    effectiveFeeRate
  };
}

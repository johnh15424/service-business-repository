/** Currency-neutral pricing engine. Percent inputs use 0–100, times use minutes.
 * No DOM, locale, service assumptions or tax defaults belong in this module.
 */
export const numericKeys = ['baseMinutes','coatMinutes','handlingMinutes','cleanupMinutes','wage','burden','shampoo','conditioner','specialist','wear','utilities','overhead','appointments','distance','vehicleRate','travelMinutes','fee','fixedFee','reserve','minimum','margin','taxRate','labourFactor'];
export function calculate(v) {
  for (const k of numericKeys) {
    if (typeof v[k] !== 'number' || !Number.isFinite(v[k]) || v[k] < 0) throw new Error(`${k}: enter a finite number of zero or more.`);
    if (v[k] > 1e9) throw new Error(`${k}: this value is too large.`);
  }
  if (v.appointments <= 0) throw new Error('Expected paid appointments must be greater than zero.');
  if (v.labourFactor < 1 || v.labourFactor > 3) throw new Error('Labour intensity must be between 1 and 3.');
  if (v.taxRate > 100 || v.burden > 100) throw new Error('Tax and payroll burden cannot exceed 100%.');
  if (v.margin >= 100 || v.fee >= 100 || v.reserve >= 100) throw new Error('Margin, fees and contingency must each be below 100%.');
  const taxRate = v.chargeTax ? v.taxRate / 100 : 0;
  const effectiveFee = v.fee / 100 * (v.feeBasis === 'total' ? 1 + taxRate : 1);
  const denominator = 1 - v.margin / 100 - v.reserve / 100 - effectiveFee;
  if (denominator <= 0.000001) throw new Error('Margin + contingency + effective payment fees must total less than 100%. Lower one of these percentages.');
  const groomMinutes = v.baseMinutes + v.coatMinutes + v.handlingMinutes + v.cleanupMinutes;
  const travelMinutes = v.mobile ? v.travelMinutes : 0;
  const totalMinutes = groomMinutes + travelMinutes;
  if (totalMinutes <= 0) throw new Error('Enter some appointment time before calculating.');
  // Intensity applies to grooming labour only, never to travel.
  const loadedRate = v.wage * (1 + v.burden / 100);
  const labour = groomMinutes / 60 * loadedRate * v.labourFactor;
  const travelLabour = travelMinutes / 60 * loadedRate;
  const consumables = v.shampoo + v.conditioner + v.specialist;
  const vehicle = v.mobile ? v.distance * v.vehicleRate : 0;
  const overhead = v.overhead / v.appointments;
  const direct = labour + travelLabour + consumables + v.wear + v.utilities + vehicle;
  const core = direct + overhead + v.fixedFee;
  const required = core / denominator;
  // Round upwards to the currency cent so the unrounded recommendation is not undercut.
  const preTax = Math.ceil((Math.max(required, v.minimum) - 1e-9) * 100) / 100;
  const tax = Math.round((preTax * taxRate + Number.EPSILON) * 100) / 100;
  const total = preTax + tax;
  const variableFee = (v.feeBasis === 'total' ? total : preTax) * v.fee / 100;
  const reserve = preTax * v.reserve / 100;
  const grossProfit = preTax - direct;
  const retained = grossProfit - overhead - v.fixedFee - variableFee - reserve;
  const result = {labour,travelLabour,loadedRate,consumables,vehicle,overhead,direct,core,required,preTax,tax,total,variableFee,reserve,grossProfit,retained,totalMinutes,groomMinutes,effectiveFee,denominator,
    allCosts: core + variableFee + reserve,
    grossMargin: preTax ? grossProfit / preTax * 100 : 0,
    retainedMargin: preTax ? retained / preTax * 100 : 0,
    markup: core ? (preTax - core) / core * 100 : null,
    hourlyRevenue: preTax / (totalMinutes / 60),
    minimumApplied: v.minimum > required};
  if (Object.values(result).some(x => typeof x === 'number' && !Number.isFinite(x))) throw new Error('These inputs exceed the supported calculation range.');
  return result;
}

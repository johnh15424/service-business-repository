import { globalCountries, globalCurrencies, mergeCountries, populateCountrySelect, globalReviewed } from './global-locales.js';
import { calculateServicePrice } from './pricing-engine.js';

const $ = id => document.getElementById(id);
const configNode = $('niche-config');
if (!configNode) throw new Error('Missing niche configuration.');
const config = JSON.parse(configNode.textContent);
const form = $('generated-calculator');
let currency = 'EUR';
let current = null;
let completionTracked = false;

function track(event, placement){
  const detail = { event, calculator: config.id, ...(placement ? { placement } : {}) };
  try { window.dataLayer = window.dataLayer || []; window.dataLayer.push(detail); } catch {}
  try { window.dispatchEvent(new CustomEvent('calculator:conversion', { detail })); } catch {}
}

const countries = mergeCountries();
populateCountrySelect($('country'), countries, 'IE');
for (const code of globalCurrencies) {
  const option = document.createElement('option');
  option.value = code;
  option.textContent = code;
  $('currency').append(option);
}
const customCurrency = document.createElement('option');
customCurrency.value = 'CUSTOM';
customCurrency.textContent = 'Other currency';
$('currency').append(customCurrency);

for (const job of config.jobTypes) {
  const option = document.createElement('option');
  option.value = job.id;
  option.textContent = job.label;
  $('jobType').append(option);
}

function number(id){
  const el = $(id);
  const value = Number(el.value);
  if (!el.value.trim() || !el.validity.valid || !Number.isFinite(value) || value < 0) {
    throw new Error(`${el.labels?.[0]?.textContent || id}: enter a valid number.`);
  }
  return value;
}

function money(value){
  return new Intl.NumberFormat('en', { style:'currency', currency, currencyDisplay:'code' }).format(value);
}

function result(key){ return document.querySelector(`[data-result="${key}"]`); }

function setCountry(){
  const profile = countries[$('country').value] || globalCountries.IE;
  $('currency').value = profile.currency;
  $('chargeTax').value = 'no';
  $('taxRate').value = 0;
  $('taxRate').disabled = true;
  $('tax-note').textContent = `${profile.note} Local currency profile checked ${globalReviewed}.`;
  run();
  $('status').textContent = 'Country and currency loaded. Tax remains off until enabled.';
}

function labourCost(){
  const crew = number('crew');
  const hours = crew * (number('workHours') + number('travelHours'));
  const loadedRate = number('wage') * (1 + number('burden') / 100);
  return { hours, cost: hours * loadedRate };
}

function directCosts(){
  return config.directCostFields.reduce((sum, field) => sum + number(field.id), 0);
}

function run(){
  $('errors').hidden = true;
  $('errors').textContent = '';
  $('custom-currency-field').hidden = $('currency').value !== 'CUSTOM';
  $('taxRate').disabled = $('chargeTax').value !== 'yes';
  try {
    currency = $('currency').value === 'CUSTOM' ? $('customCurrency').value.trim().toUpperCase() : $('currency').value;
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Enter a three-letter currency code.');
    new Intl.NumberFormat('en', { style:'currency', currency }).format(0);
    const labour = labourCost();
    const direct = directCosts();
    const travel = number('distance') * number('vehicleRate');
    const overhead = number('monthlyOverhead') / Math.max(number('jobsMonth'), 0.000001);
    current = calculateServicePrice({
      labourCost: labour.cost,
      directCosts: direct,
      travelCost: travel,
      allocatedOverhead: overhead,
      fixedFee: number('fixedFee'),
      paymentFeeRate: number('paymentFeeRate'),
      reserveRate: number('reserveRate'),
      targetMargin: number('targetMargin'),
      minimumPreTax: number('minimumPreTax'),
      taxRate: number('taxRate'),
      chargeTax: $('chargeTax').value === 'yes',
      feeBasis: 'total'
    });
    result('hero').textContent = money(current.total);
    result('labourHours').textContent = labour.hours.toFixed(2);
    result('labourCost').textContent = money(labour.cost);
    result('directCosts').textContent = money(direct);
    result('travelCost').textContent = money(travel);
    result('overhead').textContent = money(overhead);
    result('preTax').textContent = money(current.preTax);
    result('tax').textContent = money(current.tax);
    result('retained').textContent = money(current.retainedProfit);
    result('margin').textContent = `${current.retainedMargin.toFixed(1)}%`;
    $('minimum-note').textContent = current.minimumApplied ? 'Your minimum charge sets this price.' : '';
    $('tax-summary').textContent = $('chargeTax').value === 'yes' ? `Includes ${money(current.tax)} tax at ${$('taxRate').value}%.` : 'Tax not charged on this estimate.';
    $('quick-estimate').textContent = `View estimate · ${money(current.total)}`;
  } catch (error) {
    current = null;
    $('errors').hidden = false;
    $('errors').textContent = error.message;
    document.querySelectorAll('[data-result]').forEach(el => el.textContent = '—');
    $('quick-estimate').textContent = 'Check inputs · estimate paused';
  }
}

function applyExample(){
  const job = config.jobTypes.find(x => x.id === $('jobType').value) || config.jobTypes[0];
  for (const [key, value] of Object.entries(job.example || {})) {
    const el = $(key);
    if (el) el.value = value;
  }
  run();
  const button = $('apply-example');
  const old = button.textContent;
  button.textContent = 'Example applied ✓';
  $('status').textContent = 'Example applied. Replace every figure with the real job before quoting.';
  track('example_applied', job.id);
  setTimeout(() => { button.textContent = old; }, 1600);
}

form.addEventListener('input', run);
form.addEventListener('change', event => {
  if (event.target.id === 'country') setCountry();
  else run();
});
form.addEventListener('submit', event => {
  event.preventDefault();
  run();
  if (current && !completionTracked) { completionTracked = true; track('calculator_completed'); }
  $('estimate').focus();
  $('estimate').scrollIntoView({ behavior:'smooth', block:'start' });
});
$('apply-example').addEventListener('click', applyExample);
$('reset').addEventListener('click', () => { form.reset(); setCountry(); applyExample(); });
$('quick-estimate').addEventListener('click', () => track('estimate_jump_clicked', 'mobile'));
document.querySelectorAll('[data-free-cta]').forEach(link => link.addEventListener('click', () => track('free_checklist_clicked', link.dataset.freeCta)));
document.querySelectorAll('[data-paid-cta]').forEach(link => link.addEventListener('click', () => track('paid_cta_clicked', link.dataset.paidCta)));
track('calculator_viewed');
setCountry();
applyExample();

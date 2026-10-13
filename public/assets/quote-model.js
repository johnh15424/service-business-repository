/** Allowlisted customer-facing data only. Shared by editor and Worker. */
// The single price of a professional quotation PDF, used by the Worker (orders and verification) and the editor.
export const QUOTE_PRICE = Object.freeze({currency:'EUR', minor:400});
// Orders created before prices were stored per quote were all EUR 3.00 and are verified at that amount.
export const LEGACY_QUOTE_PRICE_MINOR = 300;
export const quotePriceMinor = quote => Number.isInteger(quote?.price_minor) ? quote.price_minor : LEGACY_QUOTE_PRICE_MINOR;
export const priceValue = minor => (minor / 100).toFixed(2);

// ---- Checkout currency -------------------------------------------------------------------------
// The currency the CUSTOMER PAYS US IN. This is independent of the currency written on the
// quotation document they are buying, which comes from their own calculator snapshot: an Irish
// trader can pay us in EUR for a quotation denominated in USD, and a US trader the reverse.
//
// EUR 4.00 is the live price and the base currency. USD and GBP are PROPOSED price points only.
// They stay inert — never offered, never charged — until the owner approves them by listing the
// codes in the QUOTE_CURRENCIES_APPROVED variable, exactly as QUOTE_LIVE_APPROVED gates live mode.
export const BASE_CURRENCY = QUOTE_PRICE.currency;
export const CHECKOUT_PRICES = Object.freeze({EUR: QUOTE_PRICE.minor, USD: 499, GBP: 349});
export const PROPOSED_CURRENCIES = Object.freeze(['USD', 'GBP']);
// PayPal rejects a decimal amount in HUF, JPY and TWD. Every currency above takes two decimals,
// so minor units are hundredths throughout; add a non-decimal currency and priceValue must change.
export const checkoutPriceMinor = currency => Object.hasOwn(CHECKOUT_PRICES, currency) ? CHECKOUT_PRICES[currency] : null;
/** Codes this deployment may charge in. Always includes the base currency, never anything unpriced. */
export function enabledCurrencies(env = {}) {
  const approved = new Set(String(env.QUOTE_CURRENCIES_APPROVED ?? '').normalize('NFKC').toUpperCase().split(/[^A-Z]+/).filter(Boolean));
  return [BASE_CURRENCY, ...PROPOSED_CURRENCIES.filter(c => approved.has(c) && checkoutPriceMinor(c))];
}
// Cloudflare's request.cf.country only. No external geolocation service, no extra subscription.
const countries = (codes, currency) => codes.split(' ').map(c => [c, currency]);
const COUNTRY_CURRENCY = Object.freeze(Object.fromEntries([
  // Euro area plus the territories and states that use the euro in practice.
  ...countries('AD AT BE BG CY DE EE ES FI FR GR HR IE IT LT LU LV MC ME MT NL PT SI SK SM VA XK', 'EUR'),
  // United States and the territories that use the US dollar.
  ...countries('US AS GU MP PR UM VI', 'USD'),
  ...countries('GB GG IM JE', 'GBP')
]));
export const countryCurrency = country => COUNTRY_CURRENCY[String(country ?? '').trim().toUpperCase()] ?? null;
/**
 * Default checkout currency for a visitor, with an explicit fallback flag.
 * `fallback` is true whenever we cannot charge the visitor in their own currency — unknown country,
 * or a country whose currency is not approved here — so the UI can say so before they pay.
 */
export function resolveCheckoutCurrency(country, enabled = [BASE_CURRENCY]) {
  const list = enabled.includes(BASE_CURRENCY) ? enabled : [BASE_CURRENCY, ...enabled];
  const requested = countryCurrency(country);
  if (requested && list.includes(requested)) return {currency: requested, requested, fallback: false};
  return {currency: BASE_CURRENCY, requested, fallback: true};
}
/** The currency an existing quote's order was created in. Orders predating this column were all EUR. */
export const quoteCurrency = quote => /^[A-Z]{3}$/.test(quote?.price_currency ?? '') ? quote.price_currency : BASE_CURRENCY;
export const priceLabel = (minor, currency = BASE_CURRENCY) => {
  const digits = currencyDigits(currency), unit = 10 ** digits;
  return new Intl.NumberFormat('en-IE', {style: 'currency', currency, currencyDisplay: 'narrowSymbol', minimumFractionDigits: minor % unit ? digits : 0}).format(minor / unit);
};
export function currencyDigits(currency) {
  if (!/^[A-Z]{3}$/.test(currency) || (Intl.supportedValuesOf && !Intl.supportedValuesOf('currency').includes(currency))) throw Error('Choose a recognised currency.');
  return new Intl.NumberFormat('en',{style:'currency',currency}).resolvedOptions().maximumFractionDigits;
}
export function money(minor, currency) { return new Intl.NumberFormat('en-IE',{style:'currency',currency}).format(minor / 10 ** currencyDigits(currency)); }
function text(v, max, label, required=false) {
  if(typeof v !== 'string' || v.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)) throw Error(`Check ${label} (maximum ${max} characters).`);
  if(required && !v.trim()) throw Error(`Enter ${label}.`);
  return v.trim();
}
export function normaliseQuote(input) {
  if (!input || typeof input !== 'object') throw Error('Invalid quotation.');
  const currency=text(input.currency,3,'currency',true); currencyDigits(currency);
  const party=(p,label)=>({name:text(p?.name,180,label+' name',true),address:text(p?.address??'',700,label+' address'),email:text(p?.email??'',180,label+' email'),phone:text(p?.phone??'',60,label+' telephone')});
  const taxRegistered=input.taxRegistered===true;
  const rate=Number(input.taxRate);
  if(!Number.isFinite(rate)||rate<0||rate>100||Math.abs(Math.round(rate*10000)-rate*10000)>1e-7) throw Error('Tax rate must be between 0 and 100%, with at most four decimal places.');
  if(!Array.isArray(input.items)||input.items.length<1||input.items.length>40) throw Error('Add between 1 and 40 quotation items.');
  const items=input.items.map(i=>{
    if(!Number.isSafeInteger(i.amountMinor)||i.amountMinor<0||i.amountMinor>100000000) throw Error('Check the item amount.');
    return {description:text(i.description,2000,'item description',true),amountMinor:i.amountMinor};
  });
  const subtotalMinor=items.reduce((s,i)=>s+i.amountMinor,0);
  const taxMinor=taxRegistered?Number((BigInt(subtotalMinor)*BigInt(Math.round(rate*10000))+500000n)/1000000n):0;
  const date=text(input.date,10,'quotation date',true);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date) throw Error('Enter a valid quotation date.');
  if(!Number.isInteger(input.validDays)||input.validDays<1||input.validDays>365) throw Error('Validity must be 1 to 365 days.');
  if(!['classic','modern'].includes(input.template)) throw Error('Choose a quotation design.');
  return {version:1,niche:text(input.niche,100,'service category',true),service:text(input.service??'',180,'service'),country:text(input.country,80,'country',true),currency,template:input.template,business:party(input.business,'business'),customer:party(input.customer,'customer'),reference:text(input.reference,80,'reference',true),date,validDays:input.validDays,taxRegistered,taxRate:taxRegistered?rate:0,taxLabel:text(input.taxLabel||'Tax',30,'tax label'),items,subtotalMinor,taxMinor,totalMinor:subtotalMinor+taxMinor,terms:text(input.terms??'',6000,'terms'),logo:typeof input.logo==='string'?input.logo:null};
}
export function calculatorSnapshot({niche,name,result,currency,document:doc}) {
  if(!result||!Number.isFinite(result.preTax)||!Number.isFinite(result.total)) throw Error('Calculate a valid service price first.');
  const value=id=>doc.getElementById(id)?.value;
  const selected=id=>doc.getElementById(id)?.selectedOptions?.[0]?.textContent;
  // The quotation line names the trade as well as the job type, e.g. "Window Cleaning – Standard residential clean".
  const job=(selected('jobType')||selected('service')||'').trim(),service=!job?name:job.toLowerCase().includes(String(name).toLowerCase())?job:`${name} – ${job}`;
  return {niche,service,country:selected('country')||value('country')||'Other',currency,amountMinor:Math.round(result.preTax*10**currencyDigits(currency)),taxRegistered:value('chargeTax')==='yes',taxRate:Number(value('taxRate')||0),taxLabel:value('taxLabel')||(value('country')==='IE'?'VAT':'Tax')};
}

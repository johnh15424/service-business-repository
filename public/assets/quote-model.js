/** Allowlisted customer-facing data only. Shared by editor and Worker. */
export const QUOTE_PRICE = Object.freeze({currency:'EUR', minor:300});
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
  return {niche,service:selected('jobType')||selected('service')||name,country:selected('country')||value('country')||'Other',currency,amountMinor:Math.round(result.preTax*10**currencyDigits(currency)),taxRegistered:value('chargeTax')==='yes',taxRate:Number(value('taxRate')||0),taxLabel:value('taxLabel')||(value('country')==='IE'?'VAT':'Tax')};
}

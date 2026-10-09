import {normaliseQuote, currencyDigits} from './quote-model.js';
export function decimalMinor(value, currency) {
  const digits=currencyDigits(currency),s=String(value);
  if(!new RegExp('^\\d+(?:\\.\\d{1,'+Math.max(1,digits)+'})?$').test(s) || (digits===0&&s.includes('.'))) throw Error('Use a non-negative unit price with the correct currency precision.');
  const [whole,fraction='']=s.split('.');const n=BigInt(whole)*10n**BigInt(digits)+BigInt(fraction.padEnd(digits,'0')||'0');
  if(n>100000000n)throw Error('Unit price is too large.');return Number(n);
}
export function normaliseInvoice(input) {
  if(!input||!Array.isArray(input.items))throw Error('Add invoice items.');
  const items=input.items.map(item=>{
    const quantity=String(item.quantity);
    if(!/^\d+(?:\.\d{1,3})?$/.test(quantity))throw Error('Quantity must be positive with at most three decimal places.');
    const [whole,fraction='']=quantity.split('.');const q=BigInt(whole)*1000n+BigInt(fraction.padEnd(3,'0'));
    if(q<=0n||q>100000000n)throw Error('Quantity must be greater than zero and at most 100000.');
    const unitMinor=decimalMinor(item.unitPrice,input.currency),amountMinor=Number((q*BigInt(unitMinor)+500n)/1000n);
    return {description:item.description,quantity,unitPrice:String(item.unitPrice),unitMinor,amountMinor};
  });
  const base=normaliseQuote({...input,niche:'invoice',service:'Services',validDays:30,items});
  const dueDate=input.dueDate;
  if(typeof dueDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)||!Number.isFinite(Date.parse(dueDate))||new Date(dueDate).toISOString().slice(0,10)!==dueDate||dueDate<base.date)throw Error('Due date must be a valid date on or after the invoice date.');
  const safe=(v,max,label)=>{if(typeof v!=='string'||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))throw Error('Check '+label+'.');return v.trim()};
  return {...base,documentType:'invoice',dueDate,items:items.map((item,i)=>({...item,description:base.items[i].description})),paymentInstructions:safe(input.paymentInstructions??'',2000,'payment instructions'),businessTaxId:safe(input.businessTaxId??'',100,'business tax ID'),customerTaxId:safe(input.customerTaxId??'',100,'customer tax ID')};
}

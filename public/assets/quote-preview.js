import { normaliseQuote, money, currencyDigits } from './quote-model.js';
import { convertLogo } from './quote-logo.js';
const el=(tag,text='',attrs={})=>{const n=document.createElement(tag);n.textContent=text;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
export function quoteEvent(event,niche,extra={}) {
  window.dispatchEvent(new CustomEvent('quote:conversion',{detail:{event,niche,product_type:'professional_quote',...extra}}));
}
export function mountQuotePreview({name='Service',niche=name,getSnapshot}={}) {
  if(document.getElementById('spt-quote-preview'))return;
  const estimate=document.getElementById('estimate');if(!estimate)return;
  const css=el('link','',{rel:'stylesheet',href:'/assets/quote.css'});document.head.append(css);
  const entry=el('section','',{class:'quote-entry'}),open=el('button','Generate Professional Quote',{type:'button',class:'primary'});
  entry.append(el('strong','Your price. Your branding. Ready to send.'),el('p','Create a professional quotation. Review it before a €3 once-off PDF purchase. No subscription.'),open);
  estimate.querySelector('.estimate-top')?.after(entry);if(!entry.isConnected)estimate.prepend(entry);
  const dialog=el('dialog','',{id:'spt-quote-preview',class:'quote-dialog','aria-labelledby':'quote-title'}),inner=el('div','',{class:'quote-inner'});
  const close=el('button','Close',{type:'button',class:'secondary'});close.addEventListener('click',()=>dialog.close());
  inner.append(close,el('h2','Create your professional quote',{id:'quote-title'}));
  const notice=el('p','Preview is free. Secure PDF checkout is being prepared.');inner.append(notice);
  const form=el('form'),grid=el('div','',{class:'quote-grid'}),fields={};
  function field(key,label,type='text',max=180){const wrap=el('label'),input=el(type==='textarea'?'textarea':'input','',{'aria-label':label,maxlength:String(max)});if(type!=='textarea')input.type=type;fields[key]=input;wrap.append(el('span',label),input);grid.append(wrap);return input;}
  field('businessName','Business name').required=true;field('businessAddress','Business address','textarea',700);
  field('email','Business email','email');field('phone','Business telephone','tel',60);
  field('customerName','Customer name').required=true;field('customerAddress','Customer address','textarea',700);
  field('reference','Quotation reference','text',80).required=true;field('date','Quotation date','date').required=true;
  const validity=field('validDays','Valid for (days)','number');validity.min='1';validity.max='365';validity.required=true;
  function select(key,label,options){const wrap=el('label'),s=el('select','',{'aria-label':label});for(const[v,t]of options)s.append(el('option',t,{value:v}));wrap.append(el('span',label),s);fields[key]=s;grid.append(wrap);return s;}
  select('template','Quotation design',[['classic','Classic Professional'],['modern','Modern Premium']]);
  select('taxRegistered','VAT / tax registration',[['no','Not registered / do not charge tax'],['yes','Registered / charge applicable tax']]);
  const rate=field('taxRate','VAT / tax rate (%)','number');rate.min='0';rate.max='100';rate.step='0.0001';
  field('taxLabel','Tax label','text',30);
  const logo=field('logo','Business logo','file');logo.accept='.png,.jpg,.jpeg,.webp,.avif,.pdf';
  const logoHelp=el('p','PNG, JPEG, WEBP, AVIF or PDF up to 5 MB. PDF logos use page 1. Files are converted locally to a bounded PNG.');
  form.append(grid,logoHelp,el('h3','Itemised services'));
  const rows=el('div'),add=el('button','Add item',{type:'button',class:'secondary'});form.append(rows,add);
  const terms=el('textarea','',{'aria-label':'Optional terms and conditions',maxlength:'6000',placeholder:'Optional terms and conditions'});form.append(el('p','Optional terms and conditions'),terms);
  const actions=el('div','',{class:'quote-actions'}),review=el('button','Review quotation',{type:'submit',class:'primary'}),checkout=el('button','Pay €3 once-off',{type:'button',class:'primary'});checkout.disabled=true;actions.append(review,checkout);form.append(actions);
  const status=el('p','',{role:'status','aria-live':'polite'}),paper=el('section','',{class:'quote-paper','aria-label':'Quotation preview'});
  inner.append(form,status,paper,el('p','Your quotation is not a tax invoice. Check the details and tax treatment before sending. We do not guarantee legal compliance in every country.',{class:'quote-small'}),el('p','Your draft stays in this tab until you prepare a PDF preview. Prepared PDFs are retained for 7 days. Save the private recovery link after checkout. Do not include sensitive information in service descriptions.',{class:'quote-small'}));dialog.append(inner);document.body.append(dialog);
  let snapshot,logoData=null,prepared=null,previewUrl=null,config={checkout:false,preview:false},busy=false,logoBusy=false;
  const lineRows=[];
  function invalidate(){prepared=null;checkout.disabled=true;if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}}
  function addRow(description='',amount='0'){
    if(lineRows.length>=40)return;const row=el('div','',{class:'quote-item'}),desc=el('textarea',description,{'aria-label':'Service description',maxlength:'2000',required:''}),price=el('input','',{'aria-label':'Item charge',type:'number',min:'0',step:'any',required:''});price.value=amount;
    const remove=el('button','Remove',{type:'button',class:'secondary'});row.append(desc,price,remove);rows.append(row);const record={row,desc,price};lineRows.push(record);remove.onclick=()=>{if(lineRows.length>1){lineRows.splice(lineRows.indexOf(record),1);row.remove();invalidate();}};
  }
  add.onclick=()=>{addRow();invalidate();};
  form.addEventListener('input',invalidate);form.addEventListener('change',invalidate);
  fields.taxRegistered.addEventListener('change',()=>{rate.disabled=fields.taxRegistered.value!=='yes';});
  logo.addEventListener('change',async()=>{logoBusy=true;review.disabled=true;logoData=null;invalidate();try{logoData=logo.files?.[0]?await convertLogo(logo.files[0]):null;status.textContent='Logo ready.';}catch(e){logo.value='';status.textContent=e.message;}finally{logoBusy=false;review.disabled=false;}});
  function data(){return normaliseQuote({niche,service:snapshot.service,country:snapshot.country,currency:snapshot.currency,business:{name:fields.businessName.value,address:fields.businessAddress.value,email:fields.email.value,phone:fields.phone.value},customer:{name:fields.customerName.value,address:fields.customerAddress.value},reference:fields.reference.value,date:fields.date.value,validDays:Number(validity.value),template:fields.template.value,taxRegistered:fields.taxRegistered.value==='yes',taxRate:Number(rate.value),taxLabel:fields.taxLabel.value,items:lineRows.map(r=>({description:r.desc.value,amountMinor:Math.round(Number(r.price.value)*10**currencyDigits(snapshot.currency))})),terms:terms.value,logo:logoData});}
  function render(q){paper.replaceChildren();paper.dataset.template=q.template;if(q.logo)paper.append(el('img','',{src:q.logo,alt:'Business logo'}));paper.append(el('p','QUOTATION',{class:'quote-eyebrow'}),el('h2',q.business.name),el('p',q.business.address),el('p',[q.business.email,q.business.phone].filter(Boolean).join(' | ')),el('hr'),el('h3','Prepared for '+q.customer.name),el('p',q.customer.address),el('p',`${q.reference} · ${q.date} · Valid for ${q.validDays} days`),el('p',`${q.country} · ${q.currency}`));const table=el('table'),head=el('tr');head.append(el('th','Description'),el('th','Amount'));table.append(head);for(const i of q.items){const row=el('tr');row.append(el('td',i.description),el('td',money(i.amountMinor,q.currency)));table.append(row);}for(const[label,n]of [['Subtotal',q.subtotalMinor],[q.taxRegistered?`${q.taxLabel} (${q.taxRate}%)`:'Tax not charged',q.taxMinor],['Total',q.totalMinor]]){const row=el('tr');row.append(el('th',label),el('th',money(n,q.currency)));table.append(row);}paper.append(table,el('p',q.terms),el('p','PREVIEW ONLY',{class:'quote-watermark'}));}
  async function request(path,options={}){const r=await fetch(path,options);if(!r.ok){const d=await r.json();throw Error(d.error||'Please retry.');}return r;}
  form.addEventListener('submit',async e=>{e.preventDefault();if(busy||logoBusy)return;busy=true;review.disabled=true;checkout.disabled=true;form.querySelectorAll('input,textarea,select').forEach(n=>n.disabled=true);
    try{const q=data();render(q);quoteEvent('quote_preview_updated',niche);if(config.preview){status.textContent='Preparing your A4 PDF preview…';prepared=await(await request('/api/quotes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({quote:q})})).json();const r=await request(`/api/quotes/${prepared.id}/preview`,{headers:{Authorization:'Bearer '+prepared.token}});previewUrl=URL.createObjectURL(await r.blob());const a=el('a','Open A4 PDF preview',{href:previewUrl,target:'_blank',rel:'noopener'});paper.append(a);const recovery=el('a','Keep your private recovery link',{href:'/quote-download/#'+prepared.id+'.'+prepared.token,target:'_blank',rel:'noopener noreferrer'});paper.append(el('p','Download access lasts 7 days.'),recovery);checkout.disabled=!prepared.checkout;status.textContent=prepared.checkout?'Preview ready. Review the A4 PDF before paying €3.':'PDF preview ready. Payments remain disabled during launch testing.';}else{status.textContent='Quotation preview ready. PDF checkout is not yet available.';}quoteEvent('quote_preview_completed',niche);
    }catch(e){prepared=null;status.textContent=e.message;quoteEvent('quote_fulfilment_failed',niche);}finally{busy=false;review.disabled=false;form.querySelectorAll('input,textarea,select').forEach(n=>n.disabled=false);rate.disabled=fields.taxRegistered.value!=='yes';}
  });
  checkout.addEventListener('click',async()=>{if(!prepared||busy)return;busy=true;checkout.disabled=true;try{const result=await(await request(`/api/quotes/${prepared.id}/checkout`,{method:'POST',headers:{Authorization:'Bearer '+prepared.token}})).json();quoteEvent('quote_checkout_started',niche,{value:3,currency:'EUR'});location.assign(result.url);}catch(e){status.textContent=e.message;checkout.disabled=false;}finally{busy=false;}});
  open.addEventListener('click',async()=>{try{snapshot=getSnapshot();}catch(e){entry.querySelector('p').textContent=e.message;return;}invalidate();rows.replaceChildren();lineRows.length=0;addRow(snapshot.service,(snapshot.amountMinor/10**currencyDigits(snapshot.currency)).toFixed(currencyDigits(snapshot.currency)));fields.taxRegistered.value=snapshot.taxRegistered?'yes':'no';rate.value=snapshot.taxRate;rate.disabled=!snapshot.taxRegistered;fields.taxLabel.value=snapshot.taxLabel;fields.reference.value||='Q-'+new Date().toISOString().slice(0,10).replaceAll('-','');fields.date.value||=new Date().toISOString().slice(0,10);validity.value||='30';paper.replaceChildren();dialog.showModal();quoteEvent('quote_builder_opened',niche);try{config=await(await fetch('/api/quotes/config')).json();notice.textContent=config.checkout?(config.mode==='sandbox'?'TEST CHECKOUT: sandbox payments only. No real money.':'A completed PDF costs €3 once-off. No registration or subscription.'):'Preview is free. PDF checkout is not yet available.';}catch{config={preview:false,checkout:false};}});
  dialog.addEventListener('close',()=>open.focus());
}

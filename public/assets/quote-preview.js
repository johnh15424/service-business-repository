import { normaliseQuote, money, currencyDigits, QUOTE_PRICE, BASE_CURRENCY, priceLabel, priceValue } from './quote-model.js';
import { convertLogo } from './quote-logo.js';
import { quoteOfferCopy } from './result-cta.js';
// Which currency the visitor pays US in. The server decides what may be offered and charged; this
// remembers the visitor's pick for the tab so it survives re-previewing a quote. It is unrelated to
// the currency printed on the quotation document, which comes from their calculator snapshot.
const CURRENCY_KEY='spt_checkout_currency';
const storedCurrency=()=>{try{return sessionStorage.getItem(CURRENCY_KEY);}catch{return null;}};
const rememberCurrency=code=>{try{sessionStorage.setItem(CURRENCY_KEY,code);}catch{/* private mode: the pick lasts for this page only */}};
const el=(tag,text='',attrs={})=>{const n=document.createElement(tag);n.textContent=text;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
export function quoteEvent(event,niche,extra={}) {
  window.dispatchEvent(new CustomEvent('quote:conversion',{detail:{event,niche,product_type:'professional_quote',...extra}}));
}
export function mountQuotePreview({name='Service',niche=name,getSnapshot}={}) {
  if(document.getElementById('spt-quote-preview'))return;
  const estimate=document.getElementById('estimate');if(!estimate)return;
  const css=el('link','',{rel:'stylesheet',href:'/assets/quote.css'});document.head.append(css);
  // Checkout currency state. Until the server answers, the base currency is shown: it is the one
  // price that is always available, so the offer is never advertised at an amount we cannot charge.
  let currencyOptions=[{code:BASE_CURRENCY,minor:QUOTE_PRICE.minor}],checkoutCurrency=BASE_CURRENCY,currencyLocked=false,currencyNote='';
  const option=()=>currencyOptions.find(o=>o.code===checkoutCurrency)||currencyOptions[0];
  const checkoutMinor=()=>option().minor;
  const PRICE=()=>priceLabel(checkoutMinor(),checkoutCurrency);
  // The primary paid offer under the recommended price. Copy is shared with the hero offer in result-cta.js.
  const entry=el('section','',{class:'quote-entry','aria-labelledby':'spt-quote-entry-title'}),open=el('button','',{type:'button',class:'primary','data-quote-open':'results'});
  const entryText=el('p',quoteOfferCopy.body),entryPrice=el('p','',{class:'quote-entry-price'}),entryNote=el('p',quoteOfferCopy.reassurance,{class:'quote-entry-note'});
  const setEntryText=()=>{entryPrice.textContent=`${PRICE()} once-off`;};
  setEntryText();
  entry.append(el('h3',quoteOfferCopy.headline,{id:'spt-quote-entry-title'}),entryText,entryPrice,open,entryNote);
  // Hidden until the server confirms checkout is fully configured, so no paid offer is shown that cannot be bought.
  entry.hidden=true;(document.getElementById('spt-estimate-explain')||estimate.querySelector('.estimate-top'))?.after(entry);if(!entry.isConnected)estimate.prepend(entry);
  const announce=available=>window.dispatchEvent(new CustomEvent('spt:quote-availability',{detail:{available,label:PRICE()}}));
  fetch('/api/quotes/config').then(r=>r.ok?r.json():null).then(c=>{if(!c)return announce(false);applyCurrencyConfig(c);entry.hidden=!c.checkout;announce(Boolean(c.checkout));}).catch(()=>announce(false));
  const dialog=el('dialog','',{id:'spt-quote-preview',class:'quote-dialog','aria-labelledby':'quote-title'}),inner=el('div','',{class:'quote-inner'});
  const close=el('button','Close',{type:'button',class:'secondary'});close.addEventListener('click',()=>dialog.close());
  inner.append(close,el('h2','Create your professional quote',{id:'quote-title'}));
  const notice=el('p','Preview your quote free before paying.');inner.append(notice);
  // Tells visitors when the line item still carries the example job's price rather than their own figures.
  const exampleNote=el('p','',{class:'quote-example-note'});exampleNote.hidden=true;inner.append(exampleNote);
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
  const actions=el('div','',{class:'quote-actions'}),review=el('button','Preview my quote (free)',{type:'submit',class:'primary'});actions.append(review);
  // One shared payment state drives two identical button groups: under the form and under the preview.
  // Card details are entered in PayPal-hosted fields; the card button only appears when PayPal reports this merchant eligible.
  function payGroup(){
    const wrap=el('div','',{class:'quote-pay'}),panel=el('div','',{class:'quote-card'}),buttons=el('div','',{class:'quote-actions'});
    const card=el('button','Pay by Card',{type:'button',class:'primary'}),paypal=el('button','Pay with PayPal',{type:'button',class:'primary'}),msg=el('p','',{class:'quote-pay-msg'});
    const pick=el('label','',{class:'quote-currency'}),select=el('select','',{'aria-label':'Pay in currency'});
    pick.append(el('span','Pay in'),select);
    const total=el('p','',{class:'quote-total'}),note=el('p','',{class:'quote-small'});
    panel.hidden=true;card.hidden=true;wrap.hidden=true;buttons.append(card,paypal);
    wrap.append(pick,total,note,panel,buttons,msg);
    select.addEventListener('change',()=>chooseCurrency(select.value));
    return{wrap,panel,card,paypal,msg,select,pick,total,note};
  }
  const groups=[payGroup(),payGroup()];let cardFields=null,cardPanel=null,cspBlocked='';
  const sdks=new Map();
  // Every label that quotes a price is rebuilt from one place, so the button, the total and the card
  // button can never disagree about what the visitor is about to be charged.
  function refreshPrices(){
    const label=PRICE(),amount=`${priceValue(checkoutMinor())} ${checkoutCurrency}`;
    open.textContent=quoteOfferCopy.button(label);setEntryText();
    for(const g of groups){
      g.card.textContent='Pay '+label+' by Card';g.paypal.textContent='Pay '+label+' with PayPal';
      g.total.textContent=`Total: ${amount}, one-time payment`;
      g.note.textContent=currencyNote;g.note.hidden=!currencyNote;
      g.pick.hidden=currencyOptions.length<2&&!currencyLocked;
      g.select.disabled=currencyLocked;
      if(g.select.value!==checkoutCurrency)g.select.value=checkoutCurrency;
    }
  }
  function fillCurrencySelects(){
    for(const g of groups){
      g.select.replaceChildren();
      for(const o of currencyOptions)g.select.append(el('option',`${o.code} (${priceLabel(o.minor,o.code)})`,{value:o.code}));
      g.select.value=checkoutCurrency;
    }
  }
  function applyCurrencyConfig(c){
    const list=Array.isArray(c.currencies)?c.currencies.filter(o=>/^[A-Z]{3}$/.test(o?.code)&&Number.isInteger(o?.minor)):[];
    currencyOptions=list.length?list:currencyOptions;
    const codes=currencyOptions.map(o=>o.code),stored=storedCurrency();
    // The visitor's own earlier pick wins over the edge-detected default; both must still be offered.
    checkoutCurrency=codes.includes(stored)?stored:codes.includes(c.defaultCurrency)?c.defaultCurrency:codes[0];
    currencyNote=c.currencyFallback
      ?(c.localCurrency?`We cannot charge in ${c.localCurrency} yet, so this purchase is in ${checkoutCurrency}. Your bank may apply its own conversion rate.`
        :`This purchase is charged in ${checkoutCurrency}. Your bank may apply its own conversion rate.`)
      :'';
    fillCurrencySelects();refreshPrices();
  }
  function chooseCurrency(code){
    if(currencyLocked||!currencyOptions.some(o=>o.code===code)||code===checkoutCurrency)return refreshPrices();
    checkoutCurrency=code;rememberCurrency(code);currencyNote='';
    // The PayPal SDK is loaded per currency and card fields are bound to one of them, so the card
    // panel is torn down and rebuilt rather than left showing fields priced in the old currency.
    resetCard();setStatus('');refreshPrices();
    if(prepared?.checkout)setupCard();
  }
  // Applied when the server tells us an order already exists in another currency: nothing is charged,
  // the visitor is put back on the currency their checkout was actually prepared in.
  function lockCurrency(code){
    if(currencyOptions.some(o=>o.code===code))checkoutCurrency=code;
    currencyLocked=true;resetCard();refreshPrices();if(prepared?.checkout)setupCard();
  }
  const setPay=disabled=>groups.forEach(g=>{g.card.disabled=disabled;g.paypal.disabled=disabled;});
  const showPayment=show=>{groups.forEach(g=>{g.wrap.hidden=!show;});review.hidden=show;};
  const setCardAvailable=ok=>groups.forEach(g=>{g.card.hidden=!ok;g.paypal.className=ok?'secondary':'primary';});
  setPay(true);form.append(actions,groups[0].wrap);fillCurrencySelects();refreshPrices();
  const status=el('p','',{role:'status','aria-live':'polite'}),paper=el('section','',{class:'quote-paper','aria-label':'Quotation preview'});
  inner.append(form,status,paper,el('p','Your quotation is not a tax invoice. Check the details and tax treatment before sending. We do not guarantee legal compliance in every country.',{class:'quote-small'}),el('p','Your draft stays in this tab until you prepare a PDF preview. Prepared PDFs are retained for 7 days. Save the private recovery link after checkout. Do not include sensitive information in service descriptions.',{class:'quote-small'}));paper.after(groups[1].wrap);dialog.append(inner);document.body.append(dialog);
  document.addEventListener('securitypolicyviolation',e=>{if(/paypal/i.test(String(e.blockedURI)+String(e.sourceFile)))cspBlocked=String(e.effectiveDirective).replace(/[^a-z-]/g,'').slice(0,30);});
  const setStatus=text=>{status.textContent=text;groups.forEach(g=>{g.msg.textContent=text;});};
  let snapshot,logoData=null,prepared=null,previewUrl=null,config={checkout:false,preview:false},busy=false,logoBusy=false;
  const lineRows=[];
  // A new preview is a new quote with no provider order yet, so the currency is free to change again.
  function invalidate(){prepared=null;currencyLocked=false;setPay(true);resetCard();showPayment(false);setStatus('');refreshPrices();if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}}
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
  async function request(path,options={}){const r=await fetch(path,options);if(!r.ok){const d=await r.json().catch(()=>({}));const e=Error(d.error||'Please retry.');e.data=d;e.status=r.status;throw e;}return r;}
  // One body for every checkout request, so the card path and the PayPal path can never ask for
  // different currencies for the same quote.
  const checkoutBody=method=>({method,currency:checkoutCurrency});
  form.addEventListener('submit',async e=>{e.preventDefault();if(busy||logoBusy)return;busy=true;review.disabled=true;setPay(true);form.querySelectorAll('input,textarea,select').forEach(n=>n.disabled=true);
    try{const q=data();render(q);quoteEvent('quote_preview_updated',niche);if(config.preview){status.textContent='Preparing your A4 PDF preview…';prepared=await(await request('/api/quotes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({quote:q})})).json();const r=await request(`/api/quotes/${prepared.id}/preview`,{headers:{Authorization:'Bearer '+prepared.token}});previewUrl=URL.createObjectURL(await r.blob());const a=el('a','Open A4 PDF preview',{href:previewUrl,target:'_blank',rel:'noopener'});paper.append(a);const recovery=el('a','Keep your private recovery link',{href:'/quote-download/#'+prepared.id+'.'+prepared.token,target:'_blank',rel:'noopener noreferrer'});paper.append(el('p','Download access lasts 7 days.'),recovery);setPay(!prepared.checkout);if(prepared.checkout){showPayment(true);setupCard();}status.textContent=prepared.checkout?`Preview ready. Review the A4 PDF before paying ${PRICE()}.`:'PDF preview ready. Payments remain disabled during launch testing.';}else{status.textContent='Quotation preview ready. PDF checkout is not yet available.';}quoteEvent('quote_preview_completed',niche);
    }catch(e){prepared=null;status.textContent=e.message;quoteEvent('quote_fulfilment_failed',niche);}finally{busy=false;review.disabled=false;form.querySelectorAll('input,textarea,select').forEach(n=>n.disabled=false);rate.disabled=fields.taxRegistered.value!=='yes';}
  });
  async function pay(method){
    if(!prepared||busy)return;busy=true;setPay(true);
    try{
      const result=await(await request(`/api/quotes/${prepared.id}/checkout`,{method:'POST',headers:{Authorization:'Bearer '+prepared.token,'Content-Type':'application/json'},body:JSON.stringify(checkoutBody(method))})).json();
      // Report what the server actually priced the order at, not what this page was showing.
      quoteEvent('quote_checkout_started',niche,{value:(result.priceMinor??checkoutMinor())/100,currency:result.currency||checkoutCurrency,payment_method:method});
      location.assign(result.url);
    }catch(e){
      if(e.data?.currency)lockCurrency(e.data.currency);
      setStatus(e.message);setPay(false);
    }finally{busy=false;}
  }
  function resetCard(){setCardAvailable(false);groups.forEach(g=>{g.panel.hidden=true;g.panel.replaceChildren();});cardFields=null;cardPanel=null;}
  // The SDK is priced per currency, so each one is loaded once into its own namespace. Without a
  // namespace a second load would overwrite window.paypal and leave card fields on the old currency.
  function loadSdk(clientId,currency){
    if(sdks.has(currency))return sdks.get(currency);
    const namespace='paypal_'+currency.toLowerCase();
    const loading=new Promise((resolve,reject)=>{
      const s=document.createElement('script'),nonce=document.querySelector('meta[name="spt-csp-nonce"]')?.content;
      s.src='https://www.paypal.com/sdk/js?'+new URLSearchParams({'client-id':clientId,components:'card-fields,funding-eligibility',currency,intent:'capture'});
      s.setAttribute('data-namespace',namespace);
      if(nonce){s.nonce=nonce;s.setAttribute('data-csp-nonce',nonce);}
      s.onload=()=>window[namespace]?.CardFields?resolve(window[namespace]):reject(Error('unavailable'));
      s.onerror=()=>{sdks.delete(currency);reject(Error('unavailable'));};
      document.head.append(s);
    });
    sdks.set(currency,loading);return loading;
  }
  // Content-free diagnostic so a hidden card option can be explained from the server side.
  const report=(quote,result,detail)=>fetch(`/api/quotes/${quote.id}/card-check`,{method:'POST',headers:{Authorization:'Bearer '+quote.token},body:result+(cspBlocked&&result!=='eligible'?':'+cspBlocked:detail?':'+detail:'')}).catch(()=>{});
  const cardFailed='Card payment was not completed and no payment was taken. Check your details and try again, or pay with PayPal.';
  async function setupCard(){
    resetCard();const quote=prepared,currency=checkoutCurrency;if(!quote?.checkout)return;
    if(!config.paypalClientId){report(quote,'no_client_id');return;}
    let paypal;try{paypal=await loadSdk(config.paypalClientId,currency);}catch{report(quote,'sdk_failed');return;}
    try{
      const fields=paypal.CardFields({
        createOrder:async()=>{
          // These fields were rendered for `currency`; never let a later switch send a different one.
          const r=await(await request(`/api/quotes/${quote.id}/checkout`,{method:'POST',headers:{Authorization:'Bearer '+quote.token,'Content-Type':'application/json'},body:JSON.stringify({method:'card',currency})})).json();
          quoteEvent('quote_checkout_started',niche,{value:(r.priceMinor??checkoutMinor())/100,currency:r.currency||currency});return r.orderId;
        },
        onApprove:async()=>{setStatus('Confirming payment…');try{await request(`/api/quotes/${quote.id}/capture`,{method:'POST',headers:{Authorization:'Bearer '+quote.token}});}catch{/* the download page re-checks and the server reconciles */}location.assign('/quote-download/#'+quote.id+'.'+quote.token+'?approved=1');},
        onError:()=>{setStatus(cardFailed);busy=false;setPay(false);}
      });
      const eligible=fields.isEligible(),card=eligible?'':typeof paypal.isFundingEligible!=='function'?'no-api':paypal.isFundingEligible('card')?'card-eligible':'card-ineligible';report(quote,eligible?'eligible':'ineligible',card);
      if(eligible&&quote===prepared&&currency===checkoutCurrency){cardFields=fields;setCardAvailable(true);}
    }catch{report(quote,'sdk_failed');}
  }
  async function payByCard(g){
    if(!cardFields||busy)return;
    if(!cardPanel){busy=true;setPay(true);g.panel.hidden=false;try{for(const name of ['NameField','NumberField','ExpiryField','CVVField']){const box=el('div','',{class:'quote-card-field'});g.panel.append(box);await cardFields[name]().render(box);}cardPanel=g.panel;setStatus(`Enter your card details, then select Pay ${PRICE()} by Card.`);}catch{report(prepared,'render_failed');resetCard();setStatus('Card payment is unavailable right now. You can pay with PayPal.');}finally{busy=false;setPay(false);}return;}
    if(cardPanel!==g.panel){cardPanel.scrollIntoView({behavior:'smooth',block:'center'});return;}
    busy=true;setPay(true);setStatus('Processing payment…');
    try{await cardFields.submit();}catch{setStatus(cardFailed);busy=false;setPay(false);}
  }
  groups.forEach(g=>{g.card.addEventListener('click',()=>payByCard(g));g.paypal.addEventListener('click',()=>pay('paypal'));});
  async function openEditor(placement='results'){try{snapshot=getSnapshot();}catch(e){entryText.textContent=e.message;estimate.scrollIntoView({behavior:'smooth',block:'start'});return;}
    const example=document.body.dataset.sptEstimate==='example';exampleNote.hidden=!example;
    exampleNote.textContent=example?'This price comes from the example job. Change the amount below, or close this and enter your own figures in the calculator first.':'';invalidate();rows.replaceChildren();lineRows.length=0;addRow(snapshot.service,(snapshot.amountMinor/10**currencyDigits(snapshot.currency)).toFixed(currencyDigits(snapshot.currency)));fields.taxRegistered.value=snapshot.taxRegistered?'yes':'no';rate.value=snapshot.taxRate;rate.disabled=!snapshot.taxRegistered;fields.taxLabel.value=snapshot.taxLabel;fields.reference.value||='Q-'+new Date().toISOString().slice(0,10).replaceAll('-','');fields.date.value||=new Date().toISOString().slice(0,10);validity.value||='30';paper.replaceChildren();if(!dialog.open)dialog.showModal();quoteEvent('quote_builder_opened',niche,{placement});try{config=await(await fetch('/api/quotes/config')).json();applyCurrencyConfig(config);notice.textContent=config.checkout?(config.mode==='sandbox'?'TEST CHECKOUT: sandbox payments only. No real money.':`Fill in your details and preview your quote free. You pay ${PRICE()} once-off only when you are happy with it, then download the PDF. No registration or subscription.`):'Preview is free. PDF checkout is not yet available.';}catch{config={preview:false,checkout:false};}}
  open.addEventListener('click',()=>openEditor('results'));
  window.addEventListener('spt:open-quote',e=>{if(!entry.hidden)openEditor(String(e.detail?.placement||'hero').slice(0,40));});
  dialog.addEventListener('close',()=>open.focus());
}

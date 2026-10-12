const $=id=>document.getElementById(id),status=$('quote-status'),button=$('quote-download');
// PayPal appends ?token=…&PayerID=… to the return URL, which can land inside the fragment; accept that suffix.
const match=location.hash.match(/^#([a-f0-9-]{36})\.([a-f0-9]{64})(?:[?&]|$)/);
// A payer who just approved (card fields add ?approved=1, PayPal adds PayerID) gets a bounded wait for capture.
const approved=/[?&](approved=1|PayerID=)/.test(location.hash+location.search);
if(match&&location.hash.length>102)history.replaceState(null,'',location.pathname+'#'+match[1]+'.'+match[2]);
const POLL_MS=4000,POLL_LIMIT=30;
let busy=false,paidTracked=false,paidShown=false,polls=0,timer=0,pdfUrl=null;
// Measurement goes through the shared consent-mode tag (site-analytics.js): cookies only after Accept,
// cookieless pings otherwise. Only the bare page path is reported, never the private link or customer data.
const track=(event,extra={})=>{try{window.gtag?.('event',event,{product_type:'professional_quote',page_location:location.origin+location.pathname,page_referrer:'',...extra});}catch{}};
// One purchase event per verified transaction on this device, so reloads and revisits never repeat it.
const once=key=>{try{if(localStorage.getItem(key))return false;localStorage.setItem(key,'1');}catch{}return true;};
fetch('/api/quotes/config').then(r=>r.json()).then(c=>{if(c.supportEmail){const a=document.createElement('a');a.href='mailto:'+c.supportEmail;a.textContent='Service Pricing Tools support';$('quote-support').replaceChildren(a);}}).catch(()=>{});
async function request(action,method='GET',body){const r=await fetch(`/api/quotes/${match[1]}/${action}`,{method,headers:{Authorization:'Bearer '+match[2],...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});if(!r.ok){const d=await r.json().catch(()=>({}));const e=Error(d.error||'Please try again.');e.data=d;throw e;}return r;}

// The PDF is fetched before the tap so the button is a plain link to a ready file: a direct tap on a
// download link works in iPhone Safari, Android and desktop browsers, unlike a download started after a fetch.
async function preparePdf(){
  button.hidden=false;button.setAttribute('aria-disabled','true');button.textContent='Preparing your PDF…';
  try{const blob=await(await request('download')).blob();if(blob.size<100)throw Error('The file was incomplete. Please retry.');
    pdfUrl=URL.createObjectURL(blob);button.href=pdfUrl;button.download='quotation-'+match[1].slice(0,8)+'.pdf';}
  catch(e){pdfUrl=null;button.removeAttribute('href');status.textContent=e.message;track('quote_fulfilment_failed');}
  finally{button.removeAttribute('aria-disabled');button.textContent='Download Your PDF';}
}
button.onclick=e=>{
  if(!pdfUrl){e.preventDefault();preparePdf();return;}
  status.textContent='Your PDF download has started. Save it to your device.';
  track('quote_pdf_delivered',{transaction_id:'quote_'+match[1]});request('delivered','POST').catch(()=>{});
};

function showPaid(data){
  $('quote-heading').textContent='Payment successful!';$('quote-lead').hidden=false;
  $('quote-retry').hidden=true;$('quote-resume').hidden=true;status.textContent='';
  if(!paidShown){paidShown=true;preparePdf();}
  if(!paidTracked&&data.transactionId&&Number(data.priceMinor)>0&&once('spt_purchase_'+data.transactionId)){const niche=data.niche?{niche:String(data.niche).slice(0,60)}:{},value=(Number(data.priceMinor)||0)/100;track('quote_payment_verified',{value,currency:'EUR',transaction_id:data.transactionId,...niche});track('purchase',{value,currency:'EUR',transaction_id:data.transactionId,...niche,items:[{item_id:'professional_quote',item_name:'Professional PDF quotation',price:value,quantity:1}]});paidTracked=true;}
}
// Checks the existing order only: the capture endpoint never creates an order or a second charge.
async function check(){
  if(busy||!match)return;busy=true;$('quote-retry').disabled=true;
  try{
    let data=await(await request('status')).json();
    if(data.status==='checkout'){try{await request('capture','POST');}catch{/* not confirmed yet */}data=await(await request('status')).json();}
    if(data.status==='paid')return showPaid(data);
    if(['refunded','reversed'].includes(data.status)){status.textContent='This payment was refunded or reversed, so the download is no longer available.';return;}
    if(data.status==='checkout'&&approved&&polls<POLL_LIMIT){polls++;status.textContent='Confirming your payment… Please keep this page open. Do not pay again.';timer=setTimeout(check,POLL_MS);return;}
    $('quote-retry').hidden=false;
    if(data.status==='checkout'&&approved){status.textContent='Your payment is still being confirmed. Do not pay again. Check again in a few minutes, or reopen this page link later.';return;}
    if(data.checkoutUrl){$('quote-resume').href=data.checkoutUrl;$('quote-resume').hidden=false;status.textContent='Payment is not confirmed. If you cancelled, no payment has been taken. Return to payment, or check again if you already paid.';}
    else status.textContent='Quotation status: '+data.status;
  }catch(e){status.textContent=e.message;$('quote-retry').hidden=false;}
  finally{busy=false;$('quote-retry').disabled=false;}
}
$('quote-retry').onclick=()=>{clearTimeout(timer);polls=0;check();};
if(match){$('quote-reference').textContent='Quotation reference: '+match[1];check();}else{status.textContent='This private download link is incomplete. Open the original link from your checkout.';}

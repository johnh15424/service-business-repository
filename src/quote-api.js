import { normaliseQuote } from '../public/assets/quote-model.js';
import { renderQuote } from './quote-pdf.js';
import { paypal, paymentMode, verifyPaidOrder, verifyWebhook } from './quote-paypal.js';
const encoder=new TextEncoder();
const now=()=>Math.floor(Date.now()/1000);
const headers={'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const json=(data,status=200)=>Response.json(data,{status,headers});
export const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
function available(env){return Boolean(env.QUOTE_DB&&env.QUOTE_FILES&&env.QUOTE_LIMITER);}
function paymentReady(env){return available(env)&&paymentMode(env)!=='disabled'&&env.PAYPAL_CLIENT_ID&&env.PAYPAL_CLIENT_SECRET&&env.PAYPAL_MERCHANT_ID&&env.PAYPAL_WEBHOOK_ID&&env.QUOTE_SUPPORT_EMAIL;}
async function limitedBody(request,max=1600000){
  const reader=request.body?.getReader();if(!reader)throw Error('EMPTY_REQUEST');let size=0;const chunks=[];
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('REQUEST_TOO_LARGE');}chunks.push(value);}
  const data=new Uint8Array(size);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length;}return JSON.parse(new TextDecoder().decode(data));
}
async function event(env,id,name,key=name){await env.QUOTE_DB.prepare('INSERT OR IGNORE INTO quote_events(event_key,quote_id,event,created_at) VALUES(?,?,?,?)').bind(id+':'+key,id,name,now()).run();}
async function fonts(env,origin){const get=async n=>{const r=await env.ASSETS.fetch(new Request(origin+'/assets/fonts/'+n));if(!r.ok)throw Error('FONT_UNAVAILABLE');return r.arrayBuffer();};return {regular:await get('DejaVuSans.ttf'),bold:await get('DejaVuSans-Bold.ttf')};}
async function authorised(request,env,id){
  const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');
  if(!token||!/^[a-f0-9]{64}$/.test(token))throw Error('NOT_FOUND');
  const q=await env.QUOTE_DB.prepare('SELECT * FROM quotes WHERE id=?').bind(id).first();
  if(!q||q.token_hash!==await hash(token)||q.expires_at<=now())throw Error('NOT_FOUND');return q;
}
async function fulfil(env,q,api=paypal){
  if(['refunded','reversed'].includes(q.status))throw Error('ENTITLEMENT_REVOKED');
  const order=await api(env,'/v2/checkout/orders/'+q.order_id);
  const capture=verifyPaidOrder(order,q,env.PAYPAL_MERCHANT_ID);
  await env.QUOTE_DB.prepare("UPDATE quotes SET status='paid',capture_id=?,failure_code=NULL WHERE id=? AND status NOT IN ('refunded','reversed')").bind(capture,q.id).run();
  await event(env,q.id,'quote_payment_verified');return capture;
}
async function capture(env,q,api=paypal){
  if(!q.order_id)throw Error('NO_CHECKOUT');
  if(['refunded','reversed'].includes(q.status))throw Error('ENTITLEMENT_REVOKED');
  if(q.status==='paid')return;
  // Final file must exist before any capture request can charge the customer.
  if(!await env.QUOTE_FILES.head(q.id+'/final.pdf'))throw Error('PDF_UNAVAILABLE');
  const order=await api(env,'/v2/checkout/orders/'+q.order_id);
  if(order.status==='APPROVED'){
    try{await api(env,'/v2/checkout/orders/'+q.order_id+'/capture',{method:'POST',body:{},idempotency:q.id+'-capture'});}catch{/* Reconcile an ambiguous timeout rather than charging again. */}
  }
  await fulfil(env,q,api);
}
export async function handleQuoteApi(request,env,{api=paypal,render=renderQuote}={}) {
  const url=new URL(request.url),path=url.pathname;
  if(path==='/api/quotes/config')return json({preview:available(env),checkout:Boolean(paymentReady(env)),mode:paymentMode(env),price:3,currency:'EUR',supportEmail:env.QUOTE_SUPPORT_EMAIL||null});
  if(!available(env))return json({error:'Quote downloads are not yet available. You can still edit your quotation preview.'},503);
  try{
    const webhook=path==='/api/quotes/paypal-webhook';
    if(!webhook&&request.method!=='GET'&&request.headers.get('Origin')!==url.origin)return json({error:'Invalid request origin.'},403);
    if(!webhook){const ip=request.headers.get('CF-Connecting-IP')||'unknown';const limit=await env.QUOTE_LIMITER.limit({key:ip+':'+(request.method==='GET'?'read':'write')});if(!limit.success)return json({error:'Please wait a minute and try again.'},429);}
    if(webhook){
      if(request.method!=='POST'||!paymentReady(env))return json({error:'Unavailable'},503);
      const e=await limitedBody(request,100000);await verifyWebhook(request,e,env,api);
      const orderId=e.resource?.supplementary_data?.related_ids?.order_id || (e.event_type==='CHECKOUT.ORDER.APPROVED'?e.resource?.id:null);
      let q=orderId?await env.QUOTE_DB.prepare('SELECT * FROM quotes WHERE order_id=?').bind(orderId).first():null;
      const captureId=e.resource?.supplementary_data?.related_ids?.capture_id || (e.event_type==='PAYMENT.CAPTURE.REVERSED'?e.resource?.id:null);
      if(!q&&captureId)q=await env.QUOTE_DB.prepare('SELECT * FROM quotes WHERE capture_id=?').bind(captureId).first();
      if(q){
        if(['PAYMENT.CAPTURE.REFUNDED','PAYMENT.CAPTURE.REVERSED'].includes(e.event_type)){
          await env.QUOTE_DB.prepare("UPDATE quotes SET status=? WHERE id=?").bind(e.event_type.endsWith('REFUNDED')?'refunded':'reversed',q.id).run();
        }else if(q.expires_at>now()&&e.event_type==='CHECKOUT.ORDER.APPROVED')await capture(env,q,api);
        else if(q.expires_at>now()&&e.event_type==='PAYMENT.CAPTURE.COMPLETED')await fulfil(env,q,api);
        else if(e.event_type==='PAYMENT.CAPTURE.DENIED')await event(env,q.id,'quote_payment_failed',e.id);
        await event(env,q.id,'provider_webhook',e.id);
      }
      return json({received:true});
    }
    if(path==='/api/quotes'&&request.method==='POST'){
      const body=await limitedBody(request),q=normaliseQuote(body.quote),id=crypto.randomUUID();
      const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
      const f=await fonts(env,url.origin);
      const final=await render(q,f),preview=await render(q,{...f,watermark:true});
      if(final.length>4000000)throw Error('PDF_TOO_LARGE');
      await env.QUOTE_FILES.put(id+'/final.pdf',final,{httpMetadata:{contentType:'application/pdf'}});
      await env.QUOTE_FILES.put(id+'/preview.pdf',preview,{httpMetadata:{contentType:'application/pdf'}});
      const expires=now()+7*86400;
      await env.QUOTE_DB.prepare('INSERT INTO quotes(id,token_hash,created_at,expires_at,quote_json) VALUES(?,?,?,?,?)').bind(id,await hash(token),now(),expires,JSON.stringify({niche:q.niche,currency:q.currency,template:q.template})).run();
      await event(env,id,'quote_preview_completed');
      return json({id,token,expiresAt:expires,checkout:Boolean(paymentReady(env))},201);
    }
    const match=path.match(/^\/api\/quotes\/([a-f0-9-]{36})\/(preview|checkout|capture|status|download|delivered)$/);
    if(!match)return json({error:'Not found'},404);
    const [,id,action]=match,q=await authorised(request,env,id);
    if(action==='preview'&&request.method==='GET'){
      const object=await env.QUOTE_FILES.get(id+'/preview.pdf');if(!object)throw Error('PDF_UNAVAILABLE');return new Response(object.body,{headers:{...headers,'Content-Type':'application/pdf','Content-Disposition':'inline; filename="quotation-preview.pdf"'}});
    }
    if(action==='checkout'&&request.method==='POST'){
      if(!paymentReady(env))return json({error:'Payments are disabled pending end-to-end verification.'},503);
      if(['paid','refunded','reversed'].includes(q.status))return json({error:'This quotation already has a payment. Check its download status.'},409);
      if(now()-q.created_at>5*3600)return json({error:'This checkout has expired. Create a new preview.'},410);
      if(q.checkout_url)return json({url:q.checkout_url});
      const lock=await env.QUOTE_DB.prepare('UPDATE quotes SET checkout_lock=? WHERE id=? AND checkout_lock<? AND order_id IS NULL').bind(now()+60,id,now()).run();
      if(!lock.meta.changes)return json({error:'Checkout is being prepared. Retry shortly.'},409);
      try{
        const token=request.headers.get('Authorization').slice(7),returnUrl=url.origin+'/quote-download/#'+id+'.'+token;
        const order=await api(env,'/v2/checkout/orders',{method:'POST',idempotency:id,body:{intent:'CAPTURE',purchase_units:[{reference_id:id,custom_id:id,description:'Professional PDF quotation',payee:{merchant_id:env.PAYPAL_MERCHANT_ID},amount:{currency_code:'EUR',value:'3.00'}}],payment_source:{paypal:{experience_context:{shipping_preference:'NO_SHIPPING',user_action:'PAY_NOW',return_url:returnUrl,cancel_url:returnUrl}}}}});
        const approval=order.links?.find(l=>['payer-action','approve'].includes(l.rel))?.href;
        if(!approval||!/^https:\/\/(www\.)?(sandbox\.)?paypal\.com\//.test(approval))throw Error('PROVIDER_RETRY');
        await env.QUOTE_DB.prepare("UPDATE quotes SET order_id=?,checkout_url=?,status='checkout',checkout_lock=0 WHERE id=? AND order_id IS NULL").bind(order.id,approval,id).run();
        await event(env,id,'quote_checkout_started');return json({url:approval});
      }finally{await env.QUOTE_DB.prepare('UPDATE quotes SET checkout_lock=0 WHERE id=?').bind(id).run();}
    }
    if(action==='capture'&&request.method==='POST'){await capture(env,q,api);return json({status:'paid'});}
    if(action==='status'&&request.method==='GET')return json({status:q.status,expiresAt:q.expires_at,transactionId:q.status==='paid'?'quote_'+q.id:null,checkoutUrl:q.status==='checkout'?q.checkout_url:null});
    if(action==='delivered'&&request.method==='POST'){
      if(q.status!=='paid'||!q.delivered_at)return json({error:'No verified download'},403);
      await event(env,id,'quote_pdf_delivered');return json({recorded:true});
    }
    if(action==='download'&&request.method==='GET'){
      if(q.status!=='paid')return json({error:'Verified payment is required.'},403);
      // Re-check provider capture to revoke access even if a refund webhook was missed.
      const c=await api(env,'/v2/payments/captures/'+q.capture_id);
      if(c.status!=='COMPLETED'||c.amount?.currency_code!=='EUR'||Number(c.amount?.value)!==3||c.id!==q.capture_id)throw Error('ENTITLEMENT_REVOKED');
      const file=await env.QUOTE_FILES.get(id+'/final.pdf');if(!file){await event(env,id,'quote_fulfilment_failed');throw Error('PDF_UNAVAILABLE');}
      await env.QUOTE_DB.prepare('UPDATE quotes SET delivered_at=COALESCE(delivered_at,?) WHERE id=?').bind(now(),id).run();
      await event(env,id,'quote_pdf_served');return new Response(file.body,{headers:{...headers,'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="quotation.pdf"'}});
    }
    return json({error:'Method not allowed'},405);
  }catch(e){
    const code=e.message;
    if(code==='NOT_FOUND')return json({error:'Quotation not found or download link expired.'},404);
    if(code==='INVALID_WEBHOOK')return json({error:'Invalid webhook'},401);
    if(code==='ENTITLEMENT_REVOKED')return json({error:'This payment was refunded or reversed. Downloads are unavailable.'},403);
    if(code==='PAYMENT_NOT_CONFIRMED')return json({error:'Payment is not confirmed. If you cancelled, no PDF has been unlocked. You can retry payment or check again.'},409);
    if(/^[A-Z_]+$/.test(code))return json({error:'Unable to complete this step. Please retry. Do not pay again if you have already paid.',code},503);
    // Validation messages are controlled by our model; unexpected exception details stay private.
    return json({error:/^(Check |Enter |Choose |Add |Tax rate|Validity|The file|Invalid converted|Invalid PNG|Converted logo|A character)/.test(code)?code:'Unable to prepare the quotation. Check your details and logo, then retry.'},400);
  }
}
export async function cleanExpiredQuotes(env){
  if(!env.QUOTE_DB||!env.QUOTE_FILES)return;
  const rows=await env.QUOTE_DB.prepare('SELECT id FROM quotes WHERE expires_at<? LIMIT 100').bind(now()).all();
  for(const {id}of rows.results){await env.QUOTE_FILES.delete([id+'/final.pdf',id+'/preview.pdf']);await env.QUOTE_DB.batch([env.QUOTE_DB.prepare('DELETE FROM quote_events WHERE quote_id=?').bind(id),env.QUOTE_DB.prepare('DELETE FROM quotes WHERE id=?').bind(id)]);}
}

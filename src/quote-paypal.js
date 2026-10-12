/** Credentials are Worker secrets. No provider credentials reach the browser. */
export function paymentMode(env) {
  if(env.QUOTE_PAYMENT_MODE==='sandbox')return 'sandbox';
  if(env.QUOTE_PAYMENT_MODE==='live'&&env.QUOTE_LIVE_APPROVED==='e2e-verified')return 'live';
  return 'disabled';
}
export async function paypal(env,path,{method='GET',body,idempotency}={}) {
  const mode=paymentMode(env);if(mode==='disabled')throw Error('PAYMENTS_DISABLED');
  const base=mode==='sandbox'?'https://api-m.sandbox.paypal.com':'https://api-m.paypal.com';
  const auth=await fetch(base+'/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+btoa(env.PAYPAL_CLIENT_ID+':'+env.PAYPAL_CLIENT_SECRET),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',signal:AbortSignal.timeout(15000)});
  if(!auth.ok)throw Error('PROVIDER_AUTH');const token=await auth.json();
  const res=await fetch(base+path,{method,headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json',...(idempotency?{'PayPal-Request-Id':idempotency}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
  if(!res.ok)throw Error('PROVIDER_RETRY');return res.json();
}
export function verifyPaidOrder(order,quote,merchantId) {
  const units=order.purchase_units;
  if(order.id!==quote.order_id||order.status!=='COMPLETED'||order.intent!=='CAPTURE'||units?.length!==1)throw Error('PAYMENT_NOT_CONFIRMED');
  const u=units[0],caps=u.payments?.captures;
  if(u.custom_id!==quote.id||u.payee?.merchant_id!==merchantId||u.amount?.currency_code!=='EUR'||Number(u.amount?.value)!==3||caps?.length!==1)throw Error('PAYMENT_MISMATCH');
  const c=caps[0];
  if(c.status!=='COMPLETED'||c.amount?.currency_code!=='EUR'||Number(c.amount?.value)!==3||!c.id)throw Error('PAYMENT_NOT_CONFIRMED');
  return c.id;
}
export async function verifyWebhook(request,event,env,api=paypal) {
  const headers=request.headers;
  const names=['paypal-auth-algo','paypal-cert-url','paypal-transmission-id','paypal-transmission-sig','paypal-transmission-time'];
  if(names.some(n=>!headers.get(n)))throw Error('INVALID_WEBHOOK');
  const result=await api(env,'/v1/notifications/verify-webhook-signature',{method:'POST',body:{auth_algo:headers.get(names[0]),cert_url:headers.get(names[1]),transmission_id:headers.get(names[2]),transmission_sig:headers.get(names[3]),transmission_time:headers.get(names[4]),webhook_id:env.PAYPAL_WEBHOOK_ID,webhook_event:event}});
  if(result.verification_status!=='SUCCESS')throw Error('INVALID_WEBHOOK');
}
const REQUIRED_EVENTS=['CHECKOUT.ORDER.APPROVED','PAYMENT.CAPTURE.COMPLETED','PAYMENT.CAPTURE.DENIED','PAYMENT.CAPTURE.REFUNDED','PAYMENT.CAPTURE.REVERSED'];
const SECRET_NAMES=['PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET','PAYPAL_MERCHANT_ID','PAYPAL_WEBHOOK_ID'];
/** Content-free readiness summary for operators: which secrets exist (never their values), whether
 * PayPal accepts the credentials, and whether the registered webhook targets the expected endpoint. */
export async function providerReadiness(env,fetchImpl=fetch){
  const configured=env.QUOTE_PAYMENT_MODE;
  if(configured!=='live'&&configured!=='sandbox')return 'mode:'+(configured||'unset');
  const secrets=SECRET_NAMES.map(n=>env[n]?1:0).join('');
  let out=`mode:${configured}|secrets:${secrets}|approved:${env.QUOTE_LIVE_APPROVED==='e2e-verified'?1:0}`;
  if(secrets!=='1111')return out;
  const base=configured==='sandbox'?'https://api-m.sandbox.paypal.com':'https://api-m.paypal.com';
  try{
    const auth=await fetchImpl(base+'/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+btoa(env.PAYPAL_CLIENT_ID+':'+env.PAYPAL_CLIENT_SECRET),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',signal:AbortSignal.timeout(15000)});
    if(!auth.ok)return out+'|oauth:fail'+auth.status;
    const {access_token}=await auth.json();out+='|oauth:ok';
    const res=await fetchImpl(base+'/v1/notifications/webhooks/'+encodeURIComponent(env.PAYPAL_WEBHOOK_ID),{headers:{Authorization:'Bearer '+access_token},signal:AbortSignal.timeout(15000)});
    if(!res.ok)return out+'|webhook:missing'+res.status;
    const hook=await res.json(),url=new URL(hook.url||'https://invalid/');
    const names=new Set((hook.event_types||[]).map(e=>e.name));
    const host=configured==='live'?['servicepricingtools.com','www.servicepricingtools.com'].includes(url.hostname):url.hostname.endsWith('.workers.dev');
    out+=`|webhook_url:${host&&url.pathname==='/api/quotes/paypal-webhook'?'ok':'mismatch'}|webhook_events:${REQUIRED_EVENTS.filter(n=>names.has(n)||names.has('*')).length}/5`;
  }catch{out+='|provider:unreachable';}
  return out;
}

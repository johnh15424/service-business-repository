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

import {test} from 'node:test';import assert from 'node:assert/strict';
import {providerReadiness} from '../src/quote-paypal.js';
const full={QUOTE_PAYMENT_MODE:'live',PAYPAL_CLIENT_ID:'id',PAYPAL_CLIENT_SECRET:'zzTopSecretValue',PAYPAL_MERCHANT_ID:'M',PAYPAL_WEBHOOK_ID:'WH1'};
const events=['CHECKOUT.ORDER.APPROVED','PAYMENT.CAPTURE.COMPLETED','PAYMENT.CAPTURE.DENIED','PAYMENT.CAPTURE.REFUNDED','PAYMENT.CAPTURE.REVERSED'].map(name=>({name}));
const sdkScript='window.x={"fundingEligibility":{"paypal":{"eligible":true,"branded":true},"card":{"eligible":true,"branded":true,"vendors":{"visa":{"eligible":true}}}}};';
const fake=(hook,authOk=true)=>async url=>url.endsWith('/oauth2/token')?{ok:authOk,status:authOk?200:401,json:async()=>({access_token:'t'})}
  :url.startsWith('https://www.paypal.com/sdk/js?')?{ok:true,status:200,text:async()=>sdkScript}
  :url.endsWith('/find-eligible-methods')?{ok:true,status:200,json:async()=>({eligible_methods:{paypal:{can_be_vaulted:false},venmo:{}},customer:{email:'buyer@example.com'}})}
  :{ok:Boolean(hook),status:hook?200:404,json:async()=>hook};
test('reports missing secrets by position without values',async()=>{const r=await providerReadiness({QUOTE_PAYMENT_MODE:'live',PAYPAL_CLIENT_ID:'abc'});assert.equal(r,'mode:live|secrets:1000|approval:missing');assert.doesNotMatch(r,/abc/);});
test('confirms live credentials and the expected webhook',async()=>{const r=await providerReadiness(full,fake({url:'https://servicepricingtools.com/api/quotes/paypal-webhook',event_types:events}));assert.equal(r,'mode:live|secrets:1111|approval:missing|oauth:ok|webhook_url:ok|webhook_events:5/5|client:id|sdk_card:eligible=true,branded=true|sdk_card_ios:eligible=true,branded=true|methods:eligible_methods.paypal.can_be_vaulted=false,customer.email');assert.doesNotMatch(r,/buyer@example/);assert.doesNotMatch(r,/zzTopSecretValue|WH1/);});
test('flags wrong credentials, wrong webhook URL and missing events',async()=>{assert.match(await providerReadiness(full,fake(null,false)),/oauth:fail401$/);assert.match(await providerReadiness(full,fake(null)),/webhook:missing404$/);assert.match(await providerReadiness(full,fake({url:'https://x.workers.dev/api/quotes/paypal-webhook',event_types:events.slice(0,2)})),/webhook_url:mismatch\|webhook_events:2\/5\|client:/);});
test('card evidence records the public client ID suffix only and survives PayPal failures',async()=>{
  const env={...full,PAYPAL_CLIENT_ID:'AbCdEfGhIjKlMnOp123456'};
  const down=async url=>url.endsWith('/oauth2/token')?{ok:true,status:200,json:async()=>({access_token:'t'})}:url.includes('/notifications/webhooks/')?{ok:true,status:200,json:async()=>({url:'https://servicepricingtools.com/api/quotes/paypal-webhook',event_types:events})}:url.includes('/sdk/js')?{ok:true,status:200,text:async()=>'no eligibility here'}:{ok:false,status:403};
  const r=await providerReadiness(env,down);
  assert.match(r,/\|client:123456\|sdk_card:unparsed\|sdk_card_ios:unparsed\|methods:http403$/);assert.doesNotMatch(r,/AbCdEf|zzTopSecretValue/);
});
test('PayPal API calls reuse one OAuth token until it nears expiry, and drop it on 401',async()=>{
  const {paypal}=await import('../src/quote-paypal.js');const real=globalThis.fetch;let tokens=0,calls=0,unauth=false;
  globalThis.fetch=async url=>{if(String(url).endsWith('/oauth2/token')){tokens++;return Response.json({access_token:'t'+tokens,expires_in:32400});}calls++;return unauth?new Response('',{status:401}):Response.json({ok:true});};
  try{const env={QUOTE_PAYMENT_MODE:'sandbox',PAYPAL_CLIENT_ID:'cache-test',PAYPAL_CLIENT_SECRET:'s'};
    for(let i=0;i<5;i++)await paypal(env,'/v2/checkout/orders/X');assert.equal(tokens,1);assert.equal(calls,5);
    unauth=true;await assert.rejects(paypal(env,'/v2/checkout/orders/X'));unauth=false;await paypal(env,'/v2/checkout/orders/X');assert.equal(tokens,2);
  }finally{globalThis.fetch=real;}
});

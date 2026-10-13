// International checkout currency: what we may offer, what we charge, and what we verify.
//
// The rule these tests exist to protect: the currency a customer pays us in is decided by the SERVER,
// recorded on the quote row when the PayPal order is created, and every later check — capture
// verification, download re-check, analytics — reads it back from that row. Nothing downstream trusts
// a currency supplied by the browser.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';
import {handleQuoteApi,hash} from '../src/quote-api.js';
import {verifyPaidOrder} from '../src/quote-paypal.js';
import {BASE_CURRENCY,CHECKOUT_PRICES,PROPOSED_CURRENCIES,enabledCurrencies,countryCurrency,resolveCheckoutCurrency,checkoutPriceMinor,quoteCurrency,priceLabel} from '../public/assets/quote-model.js';

const schema=['0001_quotes.sql','0002_email_delivery.sql','0003_quote_price.sql','0004_quote_currency.sql']
  .map(f=>readFileSync(new URL('../migrations/'+f,import.meta.url),'utf8')).join('\n');
const id='12345678-1234-1234-1234-123456789012',token='a'.repeat(64),origin='https://test.example';
const ALL='USD,GBP';

function dbAdapter(){const db=new DatabaseSync(':memory:');db.exec(schema);const wrap=(sql,args=[])=>({bind(...a){return wrap(sql,a)},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}},async run(){return {meta:db.prepare(sql).run(...args)}}});return{prepare:wrap,batch:a=>Promise.all(a.map(x=>x.run())),db};}

/**
 * A quote ready for checkout.
 * @param {object} [options]
 * @param {string} [options.approved]      value of QUOTE_CURRENCIES_APPROVED
 * @param {string} [options.documentCurrency] currency printed on the quotation being bought
 * @param {boolean} [options.ordered]      start with a provider order already in place
 */
async function setup({approved=ALL,documentCurrency='EUR',ordered=false}={}){
  const files=new Map([[id+'/final.pdf',new Uint8Array([37,80,68,70,45])]]);
  const env={QUOTE_DB:dbAdapter(),
    QUOTE_FILES:{head:async k=>files.has(k),get:async k=>files.has(k)?{body:files.get(k)}:null,delete:async keys=>keys.forEach(k=>files.delete(k)),put:async(k,v)=>files.set(k,v)},
    QUOTE_LIMITER:{limit:async()=>({success:true})},QUOTE_PAYMENT_MODE:'sandbox',QUOTE_CURRENCIES_APPROVED:approved,
    PAYPAL_CLIENT_ID:'test',PAYPAL_CLIENT_SECRET:'test',PAYPAL_MERCHANT_ID:'merchant',PAYPAL_WEBHOOK_ID:'webhook',QUOTE_SUPPORT_EMAIL:'support@example.com'};
  const t=Math.floor(Date.now()/1000);
  await env.QUOTE_DB.prepare('INSERT INTO quotes(id,token_hash,created_at,expires_at,quote_json,order_id,status) VALUES(?,?,?,?,?,?,?)')
    .bind(id,await hash(token),t,t+3600,JSON.stringify({niche:'window_cleaning',currency:documentCurrency,template:'classic'}),ordered?'ORDER1':null,ordered?'checkout':'ready').run();
  return{env,files};
}
const row=env=>env.QUOTE_DB.prepare('SELECT * FROM quotes WHERE id=?').bind(id).first();
const checkout=(env,currency,api)=>handleQuoteApi(new Request(`${origin}/api/quotes/${id}/checkout`,{
  method:'POST',headers:{Origin:origin,Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:currency===undefined?undefined:JSON.stringify({method:'card',currency})}),env,{api});
const config=(env,country)=>{const r=new Request(origin+'/api/quotes/config');if(country)r.cf={country};return handleQuoteApi(r,env).then(x=>x.json());};
// A provider order that paid the given amount in the given currency.
const order=(currency,value)=>({id:'ORDER1',intent:'CAPTURE',status:'COMPLETED',purchase_units:[{custom_id:id,payee:{merchant_id:'merchant'},
  amount:{currency_code:currency,value},payments:{captures:[{id:'CAPTURE1',status:'COMPLETED',amount:{currency_code:currency,value}}]}}]});
const creator=seen=>async(_e,path,o)=>{
  if(path==='/v2/checkout/orders'){seen.push(o);return{id:'ORDER'+seen.length,links:[{rel:'payer-action',href:'https://www.sandbox.paypal.com/checkoutnow?token=T'}]};}
  return{};
};

// ---- The catalogue ------------------------------------------------------------------------------

test('EUR 4.00 remains the base price and USD/GBP stay proposals until approved',()=>{
  assert.equal(BASE_CURRENCY,'EUR');
  assert.equal(CHECKOUT_PRICES.EUR,400,'the live EUR price is unchanged');
  assert.deepEqual([...PROPOSED_CURRENCIES],['USD','GBP']);
  // Unset, blank or unrelated values must never open a non-EUR price point.
  for(const value of [undefined,'','  ','false','no','EU','USDX'.slice(0,2)])
    assert.deepEqual(enabledCurrencies({QUOTE_CURRENCIES_APPROVED:value}),['EUR'],JSON.stringify(value));
  assert.deepEqual(enabledCurrencies({QUOTE_CURRENCIES_APPROVED:'USD'}),['EUR','USD']);
  assert.deepEqual(enabledCurrencies({QUOTE_CURRENCIES_APPROVED:' usd , gbp '}),['EUR','USD','GBP']);
  // A code we hold no price for can never be enabled, however it is spelled in the variable.
  assert.deepEqual(enabledCurrencies({QUOTE_CURRENCIES_APPROVED:'JPY,CAD,AUD'}),['EUR']);
  assert.equal(checkoutPriceMinor('JPY'),null);
});

test('country maps to a currency from Cloudflare edge data alone',()=>{
  assert.equal(countryCurrency('US'),'USD');assert.equal(countryCurrency('PR'),'USD');
  assert.equal(countryCurrency('GB'),'GBP');assert.equal(countryCurrency('JE'),'GBP');
  for(const c of ['IE','DE','FR','ES','IT','NL','HR','BG'])assert.equal(countryCurrency(c),'EUR',c);
  for(const c of ['JP','AU','CA','IN','BR','ZZ','',null,undefined])assert.equal(countryCurrency(c),null,String(c));
});

test('an unsupported or unapproved country falls back to EUR and says so',()=>{
  const all=['EUR','USD','GBP'];
  assert.deepEqual(resolveCheckoutCurrency('US',all),{currency:'USD',requested:'USD',fallback:false});
  assert.deepEqual(resolveCheckoutCurrency('GB',all),{currency:'GBP',requested:'GBP',fallback:false});
  assert.deepEqual(resolveCheckoutCurrency('IE',all),{currency:'EUR',requested:'EUR',fallback:false});
  // Japan has no price point: charged in EUR, and the fallback is flagged for the buyer to be told.
  assert.deepEqual(resolveCheckoutCurrency('JP',all),{currency:'EUR',requested:null,fallback:true});
  // A US visitor before USD is approved: still EUR, still flagged, and we know what they wanted.
  assert.deepEqual(resolveCheckoutCurrency('US',['EUR']),{currency:'EUR',requested:'USD',fallback:true});
  assert.deepEqual(resolveCheckoutCurrency(undefined,all),{currency:'EUR',requested:null,fallback:true});
});

test('price labels render each currency in its own symbol',()=>{
  assert.equal(priceLabel(400,'EUR'),'€4');
  assert.equal(priceLabel(499,'USD'),'$4.99');
  assert.equal(priceLabel(349,'GBP'),'£3.49');
});

// ---- What the browser is offered ----------------------------------------------------------------

test('config offers only approved currencies and defaults from the edge country',async()=>{
  const {env}=await setup();
  const us=await config(env,'US');
  assert.deepEqual(us.currencies,[{code:'EUR',minor:400},{code:'USD',minor:499},{code:'GBP',minor:349}]);
  assert.equal(us.defaultCurrency,'USD');assert.equal(us.currencyFallback,false);
  assert.equal((await config(env,'GB')).defaultCurrency,'GBP');
  assert.equal((await config(env,'IE')).defaultCurrency,'EUR');
  const jp=await config(env,'JP');
  assert.equal(jp.defaultCurrency,'EUR');assert.equal(jp.currencyFallback,true);assert.equal(jp.localCurrency,null);
  // The legacy fields the editor and tests already rely on keep describing the EUR base price.
  assert.equal(us.price,4);assert.equal(us.priceMinor,400);assert.equal(us.currency,'EUR');
});

test('with nothing approved the site is EUR only, and a US visitor is told why',async()=>{
  const {env}=await setup({approved:''});
  const us=await config(env,'US');
  assert.deepEqual(us.currencies,[{code:'EUR',minor:400}]);
  assert.equal(us.defaultCurrency,'EUR');
  assert.equal(us.currencyFallback,true);
  assert.equal(us.localCurrency,'USD','the UI can name the currency it cannot charge in');
});

// ---- Charging -----------------------------------------------------------------------------------

test('each supported currency creates an order at its own price and records it',async()=>{
  for(const [currency,minor,value] of [['EUR',400,'4.00'],['USD',499,'4.99'],['GBP',349,'3.49']]){
    const {env}=await setup();const seen=[];
    const r=await checkout(env,currency,creator(seen));
    assert.equal(r.status,200,currency);
    const body=await r.json();
    assert.equal(body.currency,currency);assert.equal(body.priceMinor,minor);
    assert.deepEqual(seen[0].body.purchase_units[0].amount,{currency_code:currency,value},currency);
    // Currency is part of the idempotency key, so a retry can never reuse an order priced differently.
    assert.equal(seen[0].idempotency,`${id}-${currency}-${minor}`);
    const q=await row(env);
    assert.equal(q.price_currency,currency);assert.equal(q.price_minor,minor);
    assert.equal(quoteCurrency(q),currency);
  }
});

test('a request naming no currency still charges the base currency',async()=>{
  const {env}=await setup();const seen=[];
  assert.equal((await checkout(env,undefined,creator(seen))).status,200);
  assert.deepEqual(seen[0].body.purchase_units[0].amount,{currency_code:'EUR',value:'4.00'});
  assert.equal((await row(env)).price_currency,'EUR');
});

test('the quotation document currency is independent of the currency we are paid in',async()=>{
  // An Irish trader quoting a US client in dollars still pays us in euro, and the reverse.
  for(const [documentCurrency,pay] of [['USD','EUR'],['EUR','GBP'],['JPY','USD']]){
    const {env}=await setup({documentCurrency});const seen=[];
    assert.equal((await checkout(env,pay,creator(seen))).status,200,`${documentCurrency}/${pay}`);
    assert.equal(seen[0].body.purchase_units[0].amount.currency_code,pay);
    const q=await row(env);
    assert.equal(q.price_currency,pay);
    assert.equal(JSON.parse(q.quote_json).currency,documentCurrency,'the document currency is untouched');
  }
});

// ---- Tampering ----------------------------------------------------------------------------------

test('an unapproved, unknown or malformed currency is refused and creates no order',async()=>{
  const {env}=await setup({approved:'USD'});let creates=0;
  const api=async(_e,path)=>{if(path==='/v2/checkout/orders')creates++;return{id:'X',links:[]};};
  // GBP has a price point but is not approved here; the rest are nonsense. `['USD']` and the number
  // are the coercion traps: String(['USD']) is 'USD', so a loose cast would wave an array through.
  for(const bad of ['GBP','JPY','CAD','XXX','€','EU','EURO','USD,GBP',400,true,{},['USD'],{code:'USD'}]){
    const r=await checkout(env,bad,api);
    assert.equal(r.status,400,JSON.stringify(bad));
    assert.match((await r.json()).error,/currency is unavailable/i);
  }
  assert.equal(creates,0,'no provider order is created for a currency we cannot charge');
  assert.equal((await row(env)).price_currency,null);
  // The approved one still works, so the refusals above are about the currency and nothing else.
  assert.equal((await checkout(env,'USD',creator([]))).status,200);
});

test('case and surrounding space in a currency code are normalised, not rejected',async()=>{
  for(const [input,expected] of [['usd','USD'],[' USD ','USD'],['Usd','USD'],['eur','EUR']]){
    const {env}=await setup({approved:'USD'});const seen=[];
    assert.equal((await checkout(env,input,creator(seen))).status,200,input);
    assert.equal(seen[0].body.purchase_units[0].amount.currency_code,expected);
    assert.equal((await row(env)).price_currency,expected);
  }
});

test('a currency switch after the order exists is refused, not silently repriced',async()=>{
  const {env}=await setup();const seen=[];
  assert.equal((await checkout(env,'USD',creator(seen))).status,200);
  const r=await checkout(env,'GBP',creator(seen));
  assert.equal(r.status,409);
  const body=await r.json();
  assert.equal(body.currency,'USD','the client is told which currency is actually prepared');
  assert.match(body.error,/already prepared in USD/);
  assert.equal(seen.length,1,'no second provider order');
  const q=await row(env);
  assert.equal(q.price_currency,'USD');assert.equal(q.price_minor,499);
  // Continuing in the prepared currency returns the same order rather than making another.
  const same=await (await checkout(env,'USD',creator(seen))).json();
  assert.equal(same.orderId,'ORDER1');assert.equal(same.currency,'USD');assert.equal(seen.length,1);
});

test('a capture in a different currency from the recorded one is never fulfilled',async()=>{
  const quote={id,order_id:'ORDER1',price_minor:499,price_currency:'USD'};
  assert.equal(verifyPaidOrder(order('USD','4.99'),quote,'merchant'),'CAPTURE1');
  // Same number, cheaper currency: the classic substitution, and the exact case this check exists for.
  assert.throws(()=>verifyPaidOrder(order('EUR','4.99'),quote,'merchant'),/PAYMENT_MISMATCH/);
  assert.throws(()=>verifyPaidOrder(order('GBP','4.99'),quote,'merchant'),/PAYMENT_MISMATCH/);
  assert.throws(()=>verifyPaidOrder(order('USD','4.00'),quote,'merchant'),/PAYMENT_MISMATCH/);
  // A capture unit that agrees with the order but a capture that does not.
  const mixed=order('USD','4.99');mixed.purchase_units[0].payments.captures[0].amount.currency_code='EUR';
  assert.throws(()=>verifyPaidOrder(mixed,quote,'merchant'),/PAYMENT_NOT_CONFIRMED/);
  // An order recorded before this column existed is still verified as EUR, never as the new default.
  assert.equal(verifyPaidOrder(order('EUR','3.00'),{id,order_id:'ORDER1',price_minor:null,price_currency:null},'merchant'),'CAPTURE1');
  assert.throws(()=>verifyPaidOrder(order('USD','3.00'),{id,order_id:'ORDER1',price_minor:null,price_currency:null},'merchant'),/PAYMENT_MISMATCH/);
});

test('a mismatched capture currency blocks the download and records a content-free failure',async()=>{
  const {env}=await setup({ordered:true});
  await env.QUOTE_DB.prepare("UPDATE quotes SET price_minor=499,price_currency='USD' WHERE id=?").bind(id).run();
  const wrong=async()=>order('EUR','4.99');
  const r=await handleQuoteApi(new Request(`${origin}/api/quotes/${id}/capture`,{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+token}}),env,{api:wrong});
  // 503 is the established response for a provider mismatch (same as a wrong merchant or amount):
  // the buyer is told to retry and not to pay again, and nothing is fulfilled.
  assert.equal(r.status,503);
  const q=await row(env);
  assert.notEqual(q.status,'paid');
  assert.equal(q.failure_code,'PAYMENT_MISMATCH:COMPLETED');
  assert.doesNotMatch(q.failure_code,/merchant|CAPTURE1/);
});

// ---- Entitlement --------------------------------------------------------------------------------

test('download re-checks the live capture against the recorded currency',async()=>{
  const {env}=await setup({ordered:true});
  await env.QUOTE_DB.prepare("UPDATE quotes SET status='paid',capture_id='CAPTURE1',price_minor=349,price_currency='GBP' WHERE id=?").bind(id).run();
  const download=api=>handleQuoteApi(new Request(`${origin}/api/quotes/${id}/download`,{headers:{Authorization:'Bearer '+token}}),env,{api});
  assert.equal((await download(async()=>({id:'CAPTURE1',status:'COMPLETED',amount:{currency_code:'GBP',value:'3.49'}}))).status,200);
  // Same amount in another currency must not keep the download alive.
  assert.equal((await download(async()=>({id:'CAPTURE1',status:'COMPLETED',amount:{currency_code:'EUR',value:'3.49'}}))).status,403);
  assert.equal((await download(async()=>({id:'CAPTURE1',status:'REFUNDED',amount:{currency_code:'GBP',value:'3.49'}}))).status,403);
});

test('status reports the currency actually charged, and EUR for pre-currency orders',async()=>{
  const {env}=await setup({ordered:true});
  const status=()=>handleQuoteApi(new Request(`${origin}/api/quotes/${id}/status`,{headers:{Authorization:'Bearer '+token}}),env).then(r=>r.json());
  assert.equal((await status()).currency,'EUR','a NULL column reads back as the base currency');
  await env.QUOTE_DB.prepare("UPDATE quotes SET price_minor=499,price_currency='USD' WHERE id=?").bind(id).run();
  const s=await status();
  assert.equal(s.currency,'USD');assert.equal(s.priceMinor,499);
});

test('a refund revokes a USD entitlement exactly as it does a EUR one',async()=>{
  const {env}=await setup({ordered:true});
  await env.QUOTE_DB.prepare("UPDATE quotes SET status='paid',capture_id='CAPTURE1',price_minor=499,price_currency='USD' WHERE id=?").bind(id).run();
  const h=Object.fromEntries(['auth-algo','cert-url','transmission-id','transmission-sig','transmission-time'].map(n=>['paypal-'+n,'x']));
  const api=async(_e,path)=>path.includes('verify-webhook')?{verification_status:'SUCCESS'}:order('USD','4.99');
  const r=await handleQuoteApi(new Request(origin+'/api/quotes/paypal-webhook',{method:'POST',headers:h,
    body:JSON.stringify({id:'E1',event_type:'PAYMENT.CAPTURE.REFUNDED',resource:{supplementary_data:{related_ids:{order_id:'ORDER1'}}}})}),env,{api});
  assert.equal(r.status,200);
  assert.equal((await row(env)).status,'refunded');
  assert.equal((await handleQuoteApi(new Request(`${origin}/api/quotes/${id}/download`,{headers:{Authorization:'Bearer '+token}}),env,{api})).status,403);
});

test('a provider failure during a USD checkout charges nothing and leaves the currency unset',async()=>{
  const {env}=await setup();
  const failing=async()=>{throw Error('PROVIDER_RETRY');};
  assert.equal((await checkout(env,'USD',failing)).status,503);
  const q=await row(env);
  assert.equal(q.order_id,null);assert.equal(q.price_currency,null);assert.notEqual(q.status,'paid');
  assert.equal(q.checkout_lock,0,'the lock is released so the buyer can retry');
  assert.match(q.failure_code,/^CHECKOUT_PROVIDER_RETRY/);
  // The retry succeeds and is the first and only order.
  const seen=[];
  assert.equal((await checkout(env,'USD',creator(seen))).status,200);
  assert.equal(seen.length,1);
});

test('concurrent requests in the same currency still produce one order',async()=>{
  const {env}=await setup();const seen=[];const api=creator(seen);
  const results=await Promise.all([checkout(env,'GBP',api),checkout(env,'GBP',api),checkout(env,'GBP',api)]);
  assert.ok(results.some(r=>r.status===200));
  assert.ok(seen.length<=1,'at most one provider order is created');
  const q=await row(env);
  if(q.order_id){assert.equal(q.price_currency,'GBP');assert.equal(q.price_minor,349);}
});

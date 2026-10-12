import {test} from 'node:test';import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';
import {handleQuoteApi,hash,reconcilePendingCheckouts} from '../src/quote-api.js';
import {normaliseEmail,deliveryMessage} from '../src/quote-email.js';
const sample={niche:'house_cleaning',service:'Deep clean',country:'Ireland',currency:'EUR',business:{name:'Murphy & Sons',address:'12 Main Street\nLimerick',email:'hello@example.com',phone:'061 123456'},customer:{name:'Sample Customer',address:'5 Oak Avenue\nCork'},reference:'Q-2026-001',date:'2026-10-08',validDays:30,template:'classic',taxRegistered:false,taxRate:23,taxLabel:'VAT',items:[{description:'Deep cleaning service',amountMinor:10000}],terms:'',logo:null};
const schema=['0001_quotes.sql','0002_email_delivery.sql','0003_quote_price.sql'].map(f=>readFileSync(new URL('../migrations/'+f,import.meta.url),'utf8')).join('\n');
const id='12345678-1234-1234-1234-123456789012',token='a'.repeat(64),origin='https://test.example';
const now=()=>Math.floor(Date.now()/1000);
function dbAdapter(){const db=new DatabaseSync(':memory:');db.exec(schema);const wrap=(sql,args=[])=>({bind(...a){return wrap(sql,a)},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}},async run(){return {meta:db.prepare(sql).run(...args)}}});return{prepare:wrap,batch:a=>Promise.all(a.map(x=>x.run())),db};}
function mailer(fail){const sent=[];return {sent,send:async m=>{if(fail){const e=fail(sent.length);if(e)throw e;}sent.push(m);return {messageId:'m'+sent.length};}};}
async function setup({email='buyer@example.com',status='checkout',mail=mailer()}={}){
  const files=new Map([[id+'/final.pdf',new Uint8Array(200).fill(37)]]);
  const env={QUOTE_DB:dbAdapter(),QUOTE_FILES:{head:async k=>files.has(k),get:async k=>files.has(k)?{body:files.get(k)}:null,delete:async keys=>keys.forEach(k=>files.delete(k)),put:async(k,v)=>files.set(k,v)},QUOTE_LIMITER:{limit:async()=>({success:true})},QUOTE_PAYMENT_MODE:'sandbox',PAYPAL_CLIENT_ID:'test',PAYPAL_CLIENT_SECRET:'test',PAYPAL_MERCHANT_ID:'merchant',PAYPAL_WEBHOOK_ID:'webhook',QUOTE_SUPPORT_EMAIL:'support@example.com',EMAIL:mail,
    ASSETS:{fetch:async()=>new Response(new Uint8Array(10))}};
  await env.QUOTE_DB.prepare('INSERT INTO quotes(id,token_hash,created_at,expires_at,quote_json,order_id,status,delivery_email) VALUES(?,?,?,?,?,?,?,?)').bind(id,await hash(token),now(),now()+7*86400,'{}','ORDER1',status,email).run();
  return {env,mail,row:()=>env.QUOTE_DB.prepare('SELECT * FROM quotes WHERE id=?').bind(id).first()};
}
const req=(action,{method='GET',auth=token,body}={})=>new Request(`${origin}/api/quotes/${id}/${action}`,{method,headers:{Origin:origin,Authorization:'Bearer '+auth,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
const order=()=>({id:'ORDER1',intent:'CAPTURE',status:'COMPLETED',purchase_units:[{custom_id:id,payee:{merchant_id:'merchant'},amount:{currency_code:'EUR',value:'3.00'},payments:{captures:[{id:'CAPTURE1',status:'COMPLETED',amount:{currency_code:'EUR',value:'3.00'}}]}}]});
const api=async(_e,path)=>path.includes('/captures/')?{id:'CAPTURE1',status:'COMPLETED',amount:{currency_code:'EUR',value:'3.00'}}:order();
const linkToken=m=>m.text.match(/quote-download\/#[a-f0-9-]{36}\.([a-f0-9]{64})/)[1];

test('delivery email addresses are validated',()=>{
  assert.equal(normaliseEmail(' Buyer@Example.ie '),'Buyer@Example.ie');assert.equal(normaliseEmail(''),null);
  for(const bad of ['buyer','buyer@','@x.ie','a b@x.ie','a@x','a@x..ie','<a@x.ie>','a@x.ie,b@y.ie','a@'+'x'.repeat(250)+'.ie'])assert.throws(()=>normaliseEmail(bad),/valid email/,bad);
});
test('quote creation stores the delivery email and rejects an invalid one',async()=>{
  const {env}=await setup();const render=async()=>new Uint8Array(200);
  const create=deliveryEmail=>handleQuoteApi(new Request(origin+'/api/quotes',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({quote:sample,deliveryEmail})}),env,{render});
  const ok=await create('owner@example.ie');assert.equal(ok.status,201);const {id:newId}=await ok.json();
  assert.equal((await env.QUOTE_DB.prepare('SELECT delivery_email FROM quotes WHERE id=?').bind(newId).first()).delivery_email,'owner@example.ie');
  const bad=await create('not-an-email');assert.equal(bad.status,400);assert.match((await bad.json()).error,/valid email/);
});
test('verified payment sends exactly one delivery email with a working secure link',async()=>{
  const {env,mail,row}=await setup();
  for(let n=0;n<3;n++)assert.equal((await handleQuoteApi(req('capture',{method:'POST'}),env,{api})).status,200);
  await reconcilePendingCheckouts(env,api);
  assert.equal(mail.sent.length,1);const m=mail.sent[0];
  assert.equal(m.to,'buyer@example.com');assert.equal(m.subject,'Your professional quotation is ready');assert.equal(m.replyTo,'support@example.com');
  assert.match(m.text,/seven days/);assert.match(m.text,new RegExp('Quotation reference: '+id));assert.match(m.html,/Download your quotation/);
  const r=await row();assert.equal(r.email_status,'sent');assert.ok(r.email_sent_at);
  // The emailed link opens the paid quotation and downloads the final PDF on its own.
  const t=linkToken(m);assert.notEqual(t,token);
  assert.equal((await (await handleQuoteApi(req('status',{auth:t}),env,{api})).json()).email,'sent');
  assert.equal((await handleQuoteApi(req('download',{auth:t}),env,{api})).status,200);
  const events=(await env.QUOTE_DB.prepare('SELECT event FROM quote_events').all()).results.map(e=>e.event).join(' ');
  assert.doesNotMatch(events,/buyer@example|[a-f0-9]{64}/);
});
test('a failed email never blocks payment or download, and retries back off until it succeeds',async()=>{
  const transient=Object.assign(Error('busy'),{code:'E_RATE_LIMITED'});
  const {env,mail,row}=await setup({mail:mailer((()=>{let calls=0;return ()=>calls++===0?transient:null;})())});
  assert.equal((await handleQuoteApi(req('capture',{method:'POST'}),env,{api})).status,200);
  assert.equal((await handleQuoteApi(req('download'),env,{api})).status,200);
  let r=await row();assert.equal(r.status,'paid');assert.equal(r.email_status,'pending');assert.equal(r.email_attempts,1);assert.ok(r.email_next_at>now());
  await reconcilePendingCheckouts(env,api);assert.equal(mail.sent.length,0,'no retry before the backoff elapses');
  await env.QUOTE_DB.prepare('UPDATE quotes SET email_next_at=? WHERE id=?').bind(now()-1,id).run();
  await reconcilePendingCheckouts(env,api);assert.equal(mail.sent.length,1);r=await row();assert.equal(r.email_status,'sent');assert.equal(r.email_attempts,2);
  await env.QUOTE_DB.prepare('UPDATE quotes SET email_next_at=NULL WHERE id=?').bind(id).run();
  await reconcilePendingCheckouts(env,api);assert.equal(mail.sent.length,1);
  const ev=(await env.QUOTE_DB.prepare("SELECT event FROM quote_events WHERE event LIKE 'quote_email_failed%'").first()).event;assert.equal(ev,'quote_email_failed:1:E_RATE_LIMITED');
});
test('permanent email failures stop retrying; attempts are capped',async()=>{
  const {env,mail,row}=await setup({mail:mailer(()=>Object.assign(Error('x'),{code:'E_RECIPIENT_SUPPRESSED'}))});
  await handleQuoteApi(req('capture',{method:'POST'}),env,{api});assert.equal((await row()).email_status,'failed');
  const capped=await setup({mail:mailer(()=>Object.assign(Error('x'),{code:'E_INTERNAL'}))});
  await handleQuoteApi(req('capture',{method:'POST'}),capped.env,{api});
  for(let n=0;n<10;n++){await capped.env.QUOTE_DB.prepare('UPDATE quotes SET email_next_at=? WHERE id=?').bind(now()-1,id).run();await reconcilePendingCheckouts(capped.env,api);}
  const r=await capped.row();assert.equal(r.email_status,'failed');assert.equal(r.email_attempts,6);assert.equal(mail.sent.length,0);
});
test('an email claim in progress is not sent twice by a concurrent caller',async()=>{
  let release;const gate=new Promise(r=>release=r);const sent=[];
  const {env}=await setup({mail:{send:async m=>{await gate;sent.push(m);return{messageId:'x'};}}});
  const first=handleQuoteApi(req('capture',{method:'POST'}),env,{api});await new Promise(r=>setTimeout(r,20));
  await reconcilePendingCheckouts(env,api);release();await first;assert.equal(sent.length,1);
});
test('no email is sent while unpaid, after a refund, or without the email binding',async()=>{
  const unpaid=await setup();await reconcilePendingCheckouts(unpaid.env,async()=>({...order(),status:'CREATED'}));assert.equal(unpaid.mail.sent.length,0);
  const refunded=await setup({status:'refunded'});await reconcilePendingCheckouts(refunded.env,api);assert.equal(refunded.mail.sent.length,0);
  const unbound=await setup();delete unbound.env.EMAIL;await handleQuoteApi(req('capture',{method:'POST'}),unbound.env,{api});
  const r=await unbound.row();assert.equal(r.status,'paid');assert.equal(r.email_status,null);
  assert.equal((await (await handleQuoteApi(req('status'),unbound.env,{api})).json()).email,'pending');
});
test('a paid quote without an address can add one once via its private link',async()=>{
  const {env,mail,row}=await setup({email:null,status:'paid'});
  await env.QUOTE_DB.prepare("UPDATE quotes SET capture_id='CAPTURE1' WHERE id=?").bind(id).run();
  assert.equal((await (await handleQuoteApi(req('status'),env,{api})).json()).email,'none');
  assert.equal((await handleQuoteApi(req('email',{method:'POST',body:{email:'bad'}}),env,{api})).status,400);
  assert.equal((await handleQuoteApi(req('email',{method:'POST',body:{email:'bad'},auth:'b'.repeat(64)}),env,{api})).status,404);
  const ok=await handleQuoteApi(req('email',{method:'POST',body:{email:'late@example.com'}}),env,{api});
  assert.equal(ok.status,200);assert.equal((await ok.json()).email,'sent');assert.equal(mail.sent.length,1);assert.equal(mail.sent[0].to,'late@example.com');
  const again=await handleQuoteApi(req('email',{method:'POST',body:{email:'other@example.com'}}),env,{api});
  assert.equal(again.status,409);assert.equal(mail.sent.length,1);assert.equal((await row()).delivery_email,'late@example.com');
});
test('email links stop working when the quotation expires or the payment is refunded',async()=>{
  const {env,mail}=await setup();await handleQuoteApi(req('capture',{method:'POST'}),env,{api});const t=linkToken(mail.sent[0]);
  await env.QUOTE_DB.prepare("UPDATE quotes SET status='refunded' WHERE id=?").bind(id).run();
  assert.equal((await handleQuoteApi(req('download',{auth:t}),env,{api})).status,403);
  await env.QUOTE_DB.prepare('UPDATE quotes SET expires_at=? WHERE id=?').bind(now()-1,id).run();
  assert.equal((await handleQuoteApi(req('status',{auth:t}),env,{api})).status,404);
});
test('delivery message escapes the link in HTML',()=>{
  const m=deliveryMessage({link:'https://x.example/quote-download/#a"b<c',reference:'r',support:null});
  assert.doesNotMatch(m.html,/a"b<c/);assert.match(m.text,/reply to this email\./);
});

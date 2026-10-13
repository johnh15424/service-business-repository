/** Local preview only. No payment credentials, no real checkout.
 * QUOTE_DEV_CHECKOUT=mock runs the real checkout, capture and download code against an in-process
 * fake PayPal so the paid journey can be exercised in a browser. Nothing here reaches PayPal. */
import http from 'node:http';import {readFile} from 'node:fs/promises';import {resolve,extname} from 'node:path';import {readdirSync} from 'node:fs';import {Readable} from 'node:stream';import {DatabaseSync} from 'node:sqlite';
import {handleQuoteApi} from '../src/quote-api.js';
const db=new DatabaseSync(':memory:');for(const f of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())db.exec(await readFile('migrations/'+f,'utf8'));
const prepare=(sql,args=[])=>({bind(...a){return prepare(sql,a)},async first(){return db.prepare(sql).get(...args)||null},async all(){return{results:db.prepare(sql).all(...args)}},async run(){return{meta:db.prepare(sql).run(...args)}}});
const files=new Map(),root=resolve('public');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ttf':'font/ttf','.pdf':'application/pdf'};
async function asset(req){let path=new URL(req.url).pathname;if(path.endsWith('/'))path+='index.html';const file=resolve(root,'.'+decodeURIComponent(path));if(!file.startsWith(root+'/'))return new Response('Not found',{status:404});try{return new Response(await readFile(file),{headers:{'Content-Type':mime[extname(file)]||'application/octet-stream'}})}catch{return new Response('Not found',{status:404})}}
const env={QUOTE_DB:{prepare,batch:xs=>Promise.all(xs.map(x=>x.run()))},QUOTE_FILES:{put:async(k,v)=>files.set(k,v),head:async k=>files.has(k),get:async k=>files.has(k)?{body:files.get(k)}:null,delete:async keys=>keys.forEach(k=>files.delete(k))},QUOTE_LIMITER:{limit:async()=>({success:true})},QUOTE_PAYMENT_MODE:'disabled',ASSETS:{fetch:asset}};
const mock=process.env.QUOTE_DEV_CHECKOUT==='mock',orders=new Map();
if(mock)Object.assign(env,{QUOTE_PAYMENT_MODE:'sandbox',QUOTE_SUPPORT_EMAIL:'support@example.com',PAYPAL_CLIENT_ID:'mock-client',PAYPAL_CLIENT_SECRET:'mock',PAYPAL_MERCHANT_ID:'mock-merchant',PAYPAL_WEBHOOK_ID:'mock'});
// Fake provider. The approval link is a sandbox.paypal.com URL (the server only accepts PayPal hosts); the
// browser tests intercept it and return to mock_return as an approving buyer would. Reads report the order
// completed at exactly the amount and currency the server asked for, as PayPal would after payment.
async function mockApi(_env,path,o={}){
  if(path==='/v2/checkout/orders'&&o.method==='POST'){const id='MOCK'+(orders.size+1),u=o.body.purchase_units[0];orders.set(id,{custom_id:u.custom_id,amount:u.amount});return{id,status:'CREATED',links:[{rel:'payer-action',href:'https://www.sandbox.paypal.com/checkoutnow?token='+id+'&mock_return='+encodeURIComponent(o.body.application_context?.return_url)}]};}
  const m=path.match(/^\/v2\/checkout\/orders\/([^/]+)/);
  if(m){const s=orders.get(m[1]);if(!s)throw Error('PROVIDER_RETRY');if(o.method==='POST')return{};return{id:m[1],intent:'CAPTURE',status:'COMPLETED',purchase_units:[{custom_id:s.custom_id,payee:{merchant_id:'mock-merchant'},amount:s.amount,payments:{captures:[{id:'CAP'+m[1],status:'COMPLETED',amount:s.amount}]}}]};}
  if(path.startsWith('/v2/payments/captures/')){const c=path.split('/').pop(),s=orders.get(c.replace(/^CAP/,''));if(!s)throw Error('PROVIDER_RETRY');return{id:c,status:'COMPLETED',amount:s.amount};}
  throw Error('PROVIDER_RETRY');
}
http.createServer(async(req,res)=>{try{const request=new Request('http://127.0.0.1:8081'+req.url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Readable.toWeb(req),duplex:'half'})});const response=req.url.startsWith('/api/quotes')?await handleQuoteApi(request,env,mock?{api:mockApi}:{}):await asset(request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('Local preview error')}}).listen(8081,'0.0.0.0',()=>console.log('Quote preview at http://127.0.0.1:8081; '+(mock?'MOCK checkout, no real payments':'payments disabled')));

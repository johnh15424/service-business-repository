import {renderInvoice} from './quote-pdf.js';
const headers={'Cache-Control':'no-store, private','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
export async function handleInvoiceApi(request,env,{render=renderInvoice}={}) {
  const url=new URL(request.url);
  if(env.INVOICE_PREVIEW_ENABLED!=='true'||['servicepricingtools.com','www.servicepricingtools.com','service-business-repository.irishambience.workers.dev'].includes(url.hostname))return new Response('Not found',{status:404,headers});
  if(url.pathname!=='/api/invoices/export'||request.method!=='POST')return new Response('Not found',{status:404,headers});
  if(request.headers.get('Origin')!==url.origin)return new Response('Invalid origin',{status:403,headers});
  if(!env.QUOTE_LIMITER)return new Response('Preview unavailable',{status:503,headers});
  const limit=await env.QUOTE_LIMITER.limit({key:'invoice:'+ (request.headers.get('CF-Connecting-IP')||'unknown')});
  if(!limit.success)return new Response('Please retry later',{status:429,headers});
  try{
    if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw Error('Send invoice data as JSON.');
    const reader=request.body?.getReader();if(!reader)throw Error('Invoice data is required.');let size=0;const parts=[];
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1600000){await reader.cancel();throw Error('Invoice data is too large.');}parts.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}
    const input=JSON.parse(new TextDecoder().decode(bytes));
    const font=async name=>{const r=await env.ASSETS.fetch(new Request(url.origin+'/assets/fonts/'+name));if(!r.ok)throw Error('Font unavailable.');return r.arrayBuffer()};
    const pdf=await render(input,{regular:await font('DejaVuSans.ttf'),bold:await font('DejaVuSans-Bold.ttf')});
    return new Response(pdf,{headers:{...headers,'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="invoice.pdf"'}});
  }catch(error){return Response.json({error:error instanceof SyntaxError?'Invalid invoice data.':error.message},{status:400,headers});}
}

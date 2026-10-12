// Transactional delivery email for paid quotations, sent through the Cloudflare Email Service binding (env.EMAIL).
// Delivery state lives on the quote row so retries from the capture endpoint, webhooks and the scheduler never
// send more than one successful email. Addresses and links are never written to events or logs.
const now=()=>Math.floor(Date.now()/1000);
const encoder=new TextEncoder();
const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
const RETRY_MINUTES=[2,10,30,60,180,360];
const PERMANENT=/SUPPRESSED|INVALID|NOT_ALLOWED|FORBIDDEN|UNAUTHORI/;

export function normaliseEmail(value){
  const email=String(value??'').trim();
  if(!email)return null;
  if(email.length>254||!/^[^\s@<>()",;:\\[\]]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(email))throw Error('Enter a valid email address for your PDF.');
  return email;
}

export const emailState=q=>q.email_status==='sent'?'sent':q.email_status==='failed'?'failed':q.delivery_email?'pending':'none';

const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function deliveryMessage({link,reference,support}){
  const text=['Thank you for your purchase.','','Your professional quotation is ready to download.','','Download your quotation:',link,'',
    'This secure link is available for seven days. Please save your PDF before it expires.','',`Quotation reference: ${reference}`,
    `If you need assistance, reply to this email${support?` or contact ${support}`:''}.`,'','Service Pricing Tools'].join('\n');
  const html=`<p>Thank you for your purchase.</p><p>Your professional quotation is ready to download.</p>`+
    `<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 20px;background:#0b5cad;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold">Download your quotation</a></p>`+
    `<p>This secure link is available for seven days. Please save your PDF before it expires.</p>`+
    `<p>Quotation reference: ${escapeHtml(reference)}</p><p>If you need assistance, reply to this email${support?` or contact ${escapeHtml(support)}`:''}.</p><p>Service Pricing Tools</p>`;
  return {subject:'Your professional quotation is ready',text,html};
}

// Claims the quote for one send attempt. The claim is a single conditional UPDATE, so concurrent callers
// (browser capture, webhook, scheduler) cannot both send. A claim that never completes is retried after 30 minutes.
export async function sendDeliveryEmail(env,id,{support=null}={}){
  if(!env.EMAIL||!env.QUOTE_DB)return 'not_configured';
  const t=now();
  const claim=await env.QUOTE_DB.prepare(`UPDATE quotes SET email_status='sending',email_attempts=email_attempts+1,email_next_at=?
    WHERE id=? AND status='paid' AND expires_at>? AND delivery_email IS NOT NULL AND email_attempts<?
    AND (email_status IS NULL OR email_status='pending' OR (email_status='sending' AND email_next_at<=?)) AND (email_next_at IS NULL OR email_next_at<=?)`)
    .bind(t+1800,id,t,RETRY_MINUTES.length,t,t).run();
  if(!claim.meta.changes)return 'skipped';
  const q=await env.QUOTE_DB.prepare('SELECT id,delivery_email,email_attempts FROM quotes WHERE id=?').bind(id).first();
  // A fresh link token for this email; only its hash is stored, alongside the buyer's original token.
  const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
  await env.QUOTE_DB.prepare('UPDATE quotes SET email_token_hash=? WHERE id=?').bind(await hash(token),id).run();
  const origin=(env.QUOTE_PUBLIC_ORIGIN||'https://servicepricingtools.com').replace(/\/$/,'');
  const message=deliveryMessage({link:`${origin}/quote-download/#${id}.${token}`,reference:id,support});
  try{
    await env.EMAIL.send({from:{email:env.QUOTE_EMAIL_FROM||'quotes@servicepricingtools.com',name:'Service Pricing Tools'},to:q.delivery_email,...(support?{replyTo:support}:{}),...message});
    await env.QUOTE_DB.prepare("UPDATE quotes SET email_status='sent',email_sent_at=?,email_next_at=NULL WHERE id=?").bind(now(),id).run();
    await event(env,id,'quote_email_sent');return 'sent';
  }catch(e){
    const code=String(e?.code||e?.message||'SEND_FAILED').toUpperCase().replace(/[^A-Z_]/g,'_').slice(0,40);
    const final=PERMANENT.test(code)||q.email_attempts>=RETRY_MINUTES.length;
    await env.QUOTE_DB.prepare('UPDATE quotes SET email_status=?,email_next_at=? WHERE id=?').bind(final?'failed':'pending',final?null:now()+RETRY_MINUTES[q.email_attempts-1]*60,id).run();
    await event(env,id,`quote_email_failed:${q.email_attempts}:${code}`);return final?'failed':'retry';
  }
}

export async function sendPendingEmails(env,opts){
  if(!env.EMAIL||!env.QUOTE_DB)return;
  const t=now();
  const rows=await env.QUOTE_DB.prepare(`SELECT id FROM quotes WHERE status='paid' AND expires_at>? AND delivery_email IS NOT NULL
    AND (email_status IS NULL OR email_status IN ('pending','sending')) AND (email_next_at IS NULL OR email_next_at<=?) LIMIT 10`).bind(t,t).all();
  for(const {id} of rows.results)await sendDeliveryEmail(env,id,opts).catch(()=>{});
}

async function event(env,id,name){await env.QUOTE_DB.prepare('INSERT OR IGNORE INTO quote_events(event_key,quote_id,event,created_at) VALUES(?,?,?,?)').bind(id+':'+name,id,name,now()).run().catch(()=>{});}

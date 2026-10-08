/**
 * Service Pricing Tools - quote builder prototype.
 * Preview only. The final PDF download MUST require server-verified payment.
 * Never trust a client-side flag, URL parameter or localStorage as payment proof.
 */
const h = (tag, attrs = {}, value = '') => {
  const el = document.createElement(tag);
  for (const [key, v] of Object.entries(attrs)) {
    if (key === 'className') el.className = v;
    else if (key === 'type' || key === 'accept' || key === 'placeholder' || key === 'aria-label') el.setAttribute(key, v);
    else el[key] = v;
  }
  if (value) el.textContent = value;
  return el;
};
const field = (label, type = 'text', value = '', maxLength = 150) => {
  const wrapper = h('label', {className:'quote-field'});
  wrapper.append(h('span', {}, label));
  const input = h('input', {type, value, maxLength, required: type !== 'file'});
  wrapper.append(input);
  return {wrapper, input};
};
function amount(text) {
  const n = Number(String(text || '').replace(/[^0-9.,-]/g, '').replace(/,/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
export function mountQuotePreview({name = 'Service', onTrack = () => {}} = {}) {
  if (document.querySelector('#spt-quote-preview')) return;
  const estimate = document.querySelector('#estimate');
  const calculatedPrice = document.querySelector('[data-result="hero"]');
  if (!estimate || !calculatedPrice) return;
  const style = h('style');
  style.textContent = `
  .quote-entry{margin:18px 0;padding:18px;border:1px solid #b9d4cf;border-radius:12px;background:#f0f8f6}
  .quote-entry button{margin-top:8px}
  .quote-dialog{border:0;border-radius:16px;padding:0;width:min(680px,calc(100% - 24px));max-height:90%;overflow:auto;box-shadow:0 20px 80px #0005}
  .quote-dialog::backdrop{background:#111a}
  .quote-inner{padding:clamp(16px,4vw,30px);color:#182b28;background:#fff}
  .quote-inner h2{margin:0 0 10px}
  .quote-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:14px;margin:18px 0}
  .quote-field{display:flex;flex-direction:column;gap:6px;font-weight:600}
  .quote-field input,.quote-field textarea,.quote-field select{width:100%;min-height:44px;border:1px solid #a2b4ae;border-radius:7px;padding:10px;font:inherit}
  .quote-actions{display:flex;gap:10px;flex-wrap:wrap}
  .quote-preview-paper{padding:22px;border:1px solid #cad5d0;border-radius:9px;position:relative;background:white;overflow:hidden}
  .quote-preview-paper::after{content:'PREVIEW ONLY';position:absolute;top:44%;left:8%;font-size:clamp(28px,8vw,58px);font-weight:900;transform:rotate(-25deg);color:#bdcccc88;pointer-events:none}
  .quote-preview-paper img{max-width:150px;max-height:80px;object-fit:contain}
  .quote-preview-paper table{width:100%;border-collapse:collapse;margin-top:20px}
  .quote-preview-paper th,.quote-preview-paper td{text-align:left;padding:9px 3px;border-bottom:1px solid #ccd7d3}
  .quote-preview-paper td:last-child,.quote-preview-paper th:last-child{text-align:right}
  .quote-muted{font-size:13px;color:#465c54}
  @media print{.quote-dialog{display:none!important}}
  `;
  document.head.append(style);
  const entry = h('section',{className:'quote-entry'});
  entry.append(h('strong',{},'Turn this estimate into a professional quote'));
  entry.append(h('p',{},'Add your branding, client and job details. Preview your quote before paying. Proposed once-off PDF price: €3. No subscription.'));
  const open = h('button',{type:'button',className:'secondary'},'Create a branded quote →');
  entry.append(open);
  const toolkit = estimate.querySelector('.result-toolkit');
  toolkit ? toolkit.before(entry) : estimate.append(entry);

  const dialog = h('dialog',{className:'quote-dialog',id:'spt-quote-preview'});
  const inside = h('div',{className:'quote-inner'});
  inside.append(h('h2',{},'Create your quote'));
  inside.append(h('p',{className:'quote-muted'},'Preview is free. PDF downloads are not yet enabled while secure €3 checkout is being integrated.'));
  const grid = h('div',{className:'quote-grid'});
  const business=field('Business name'),client=field('Customer name'),email=field('Business email','email'),reference=field('Quote reference','text','Q-001');
  const description=field('Work description','text',name);
  const validity=field('Valid for (days)','number','30');
  for(const f of [business,client,email,reference,description,validity]) grid.append(f.wrapper);
  const logo = field('Business logo','file');
  logo.input.accept='.png,.jpg,.jpeg,.webp,.avif,.pdf,image/png,image/jpeg,image/webp,image/avif,application/pdf';
  grid.append(logo.wrapper);
  inside.append(grid);
  const info=h('p',{className:'quote-muted'},'Logos: PNG, JPG, WEBP and browser-supported AVIF preview locally. PDF logos require server-side conversion before final launch. Do not upload confidential logos.');
  inside.append(info);
  const paper=h('section',{className:'quote-preview-paper','aria-label':'Quotation preview'});
  const actions=h('div',{className:'quote-actions'});
  const refresh=h('button',{type:'button',className:'primary'},'Update preview');
  const close=h('button',{type:'button',className:'secondary'},'Close');
  const locked=h('button',{type:'button',disabled:true},'PDF checkout (€3) - not yet available');
  actions.append(refresh,close,locked);
  inside.append(actions,paper);
  dialog.append(inside);
  document.body.append(dialog);
  let logoUrl=null;
  function render() {
    paper.replaceChildren();
    const logoNode=logoUrl?h('img',{src:logoUrl,alt:'Business logo'}):null;
    if(logoNode)paper.append(logoNode);
    paper.append(h('h2',{},'QUOTATION'),h('strong',{},business.input.value.trim() || 'Your business'),h('p',{},'Prepared for: '+(client.input.value.trim()||'Customer')));
    paper.append(h('p',{className:'quote-muted'},'Reference: '+(reference.input.value||'Q-001')+' | Date: '+new Date().toLocaleDateString('en-IE')));
    paper.append(h('p',{},description.input.value.trim() || name));
    const cur=document.getElementById('currency')?.value || 'EUR';
    const code=cur==='CUSTOM' ? (document.getElementById('customCurrency')?.value||'EUR') : cur;
    const fmt=n=>{try{return new Intl.NumberFormat('en-IE',{style:'currency',currency:code}).format(n)}catch{return n.toFixed(2)}};
    const total=calculatedPrice.textContent.trim();
    const preTax=document.querySelector('[data-result="preTax"]')?.textContent.trim() || 'Not calculated';
    const tax=document.querySelector('[data-result="tax"]')?.textContent.trim() || 'Not calculated';
    const table=h('table');
    const header=h('tr');header.append(h('th',{},'Description'),h('th',{},'Amount'));
    table.append(header);
    for(const [l,v] of [['Services (before tax)',preTax],['Tax',tax],['Total',total]]){
      const row=h('tr');row.append(h('td',{},l),h('td',{},v));table.append(row);
    }
    paper.append(table);
    paper.append(h('p',{className:'quote-muted'},'Country: '+(document.getElementById('country')?.selectedOptions?.[0]?.textContent || 'Not selected')+
     ' | Valid for '+(Math.max(1,Math.min(365,Number(validity.input.value)||30)))+' days'));
    paper.append(h('p',{className:'quote-muted'},'Check tax treatment, customer details and final amounts before sending. This is a quotation, not a VAT invoice.'));
    onTrack('quote_preview_updated');
  }
  async function handleLogo() {
    if (logoUrl){URL.revokeObjectURL(logoUrl);logoUrl=null;}
    const file=logo.input.files?.[0];
    if(!file){info.textContent='No logo selected.';render();return;}
    if(file.size>5*1024*1024){info.textContent='Logo exceeds the 5 MB limit.';logo.input.value='';render();return;}
    if(file.type==='application/pdf'||/\.pdf$/i.test(file.name)){
      info.textContent='PDF logo selected. Server conversion is required; PDF logos cannot be previewed in this browser prototype.';render();return;
    }
    if(!['image/png','image/jpeg','image/webp','image/avif'].includes(file.type)){
      info.textContent='Unsupported logo. Choose PNG, JPG, WEBP, AVIF or PDF.';logo.input.value='';render();return;
    }
    logoUrl=URL.createObjectURL(file);
    info.textContent='Logo selected. Image stays in this browser during preview.';
    render();
  }
  open.addEventListener('click',()=>{render();dialog.showModal();onTrack('quote_builder_opened')});
  close.addEventListener('click',()=>dialog.close());
  refresh.addEventListener('click',render);
  logo.input.addEventListener('change',handleLogo);
  dialog.addEventListener('close',()=>{if(logoUrl){URL.revokeObjectURL(logoUrl);logoUrl=null;}});
}

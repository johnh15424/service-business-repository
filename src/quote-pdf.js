import { PDFDocument, rgb, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {normaliseInvoice} from '../public/assets/invoice-model.js';
import { normaliseQuote, money } from '../public/assets/quote-model.js';

export function validatePng(data) {
  if(data===null)return null;
  if(typeof data!=='string'||data.length>1400000||!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(data))throw Error('Invalid converted logo.');
  const bytes=Uint8Array.from(atob(data.split(',')[1]),c=>c.charCodeAt(0));
  if(bytes.length<33||bytes[0]!==137||String.fromCharCode(...bytes.slice(1,8))!=='PNG\r\n\x1a\n'||String.fromCharCode(...bytes.slice(12,16))!=='IHDR')throw Error('Invalid PNG contents.');
  const view=new DataView(bytes.buffer),w=view.getUint32(16),h=view.getUint32(20);
  if(!w||!h||w>1200||h>1200||w*h>1440000)throw Error('Converted logo exceeds the dimension limit.');
  return bytes;
}
export const renderQuote=(input,options)=>renderDocument(input,options,false);
export const renderInvoice=(input,options)=>renderDocument(input,options,true);
async function renderDocument(input,{regular,bold,watermark=false}={},invoice=false) {
  const q=invoice?normaliseInvoice(input):normaliseQuote(input),pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
  const font=await pdf.embedFont(regular,{subset:true}),heavy=await pdf.embedFont(bold,{subset:true});
  const supported=new Set(font.getCharacterSet());
  for(const str of [q.business.name,q.business.address,q.business.email,q.business.phone,q.customer.name,q.customer.address,q.reference,q.terms,q.country,q.taxLabel,q.paymentInstructions||'',q.businessTaxId||'',q.customerTaxId||'',...q.items.map(i=>i.description)]) for(const c of str)if(c!=='\n'&&c!=='\r'&&c!=='\t'&&!supported.has(c.codePointAt(0)))throw Error('A character in your quotation is not supported by this font. Please use Latin, Greek or Cyrillic text.');
  const raw=validatePng(q.logo),logo=raw?await pdf.embedPng(raw):null;
  const ink=rgb(.09,.16,.23),accent=q.template==='modern'?rgb(.04,.36,.34):rgb(.15,.23,.34),muted=rgb(.36,.42,.47);
  const W=595.28,H=841.89,L=45,R=550;let page,y;
  function newPage(){page=pdf.addPage([W,H]);y=H-52;page.drawRectangle({x:L,y:H-27,width:R-L,height:q.template==='modern'?8:2,color:accent});}
  const draw=(s,x,yy,size=10,f=font,color=ink)=>page.drawText(String(s),{x,y:yy,size,font:f,color});
  function ensure(height){if(y-height<65)newPage();}
  function lines(str,width,size=10,f=font){
    const out=[];
    for(const paragraph of String(str).replace(/\t/g,' ').split(/\r?\n/)){
      let line='';for(const word of paragraph.split(/\s+/)){
        const candidate=line?line+' '+word:word;
        if(f.widthOfTextAtSize(candidate,size)<=width){line=candidate;continue;}
        if(line)out.push(line);line='';
        for(const char of word){if(f.widthOfTextAtSize(line+char,size)>width){out.push(line);line='';}line+=char;}
      }out.push(line);
    }return out;
  }
  function block(str,size=10,f=font,color=ink,width=R-L){for(const line of lines(str,width,size,f)){ensure(size+8);draw(line,L,y,size,f,color);y-=size+5;}y-=5;}
  newPage();
  if(q.template==='modern')page.drawRectangle({x:L-12,y:H-120,width:R-L+24,height:90,color:accent});
  draw(invoice?'INVOICE':'QUOTATION',L,y,q.template==='modern'?21:26,heavy,q.template==='modern'?rgb(1,1,1):accent);y-=26;
  block(q.reference,10,font,q.template==='modern'?rgb(.85,.95,.93):muted,logo?320:R-L);y-=3;
  if(logo){const scale=Math.min(150/logo.width,65/logo.height);page.drawImage(logo,{x:R-logo.width*scale,y:H-119,width:logo.width*scale,height:logo.height*scale});}
  y=Math.min(y,H-140);block(q.business.name,18,heavy,accent);block(q.business.address);block([q.business.email,q.business.phone].filter(Boolean).join(' | '),9,font,muted);
  if(invoice&&q.businessTaxId)block('Tax ID: '+q.businessTaxId,9,font,muted);
  y-=10;block(invoice?'BILL TO':'PREPARED FOR',9,heavy,accent);block(q.customer.name,12,heavy);block(q.customer.address);
  if(invoice&&q.customerTaxId)block('Customer tax ID: '+q.customerTaxId,9,font,muted);
  block(invoice?`Invoice date: ${q.date}     Due date: ${q.dueDate}`:`Date: ${q.date}     Valid for: ${q.validDays} days`,9,font,muted);block(`Country / region: ${q.country}     Currency: ${q.currency}`,9,font,muted);y-=12;
  function tableHead(){ensure(36);page.drawRectangle({x:L,y:y-9,width:R-L,height:26,color:accent});draw('DESCRIPTION',L+9,y,9,heavy,rgb(1,1,1));draw('AMOUNT',R-82,y,9,heavy,rgb(1,1,1));y-=31;}
  tableHead();
  for(const item of q.items){const description=invoice?item.description+'\nQuantity: '+item.quantity+'  |  Unit price: '+money(item.unitMinor,q.currency):item.description;const ls=lines(description,330,10);let first=true;
    for(const line of ls){if(y-18<65){newPage();tableHead();}draw(line,L+9,y);if(first){const amount=money(item.amountMinor,q.currency);draw(amount,R-heavy.widthOfTextAtSize(amount,10)-8,y,10,heavy);first=false;}y-=16;}
    page.drawLine({start:{x:L,y:y+4},end:{x:R,y:y+4},thickness:.4,color:rgb(.8,.84,.86)});y-=13;
  }
  ensure(112);y-=9;
  const totals=[['Subtotal',q.subtotalMinor],[q.taxRegistered?`${q.taxLabel} (${q.taxRate}%)`:'Tax not charged',q.taxMinor],['TOTAL',q.totalMinor]];
  if(q.template==='modern')page.drawRectangle({x:L+220,y:y-67,width:R-L-220,height:88,color:rgb(.91,.96,.95)});
  for(const [label,val]of totals){draw(label,L+235,y,11,heavy);const s=money(val,q.currency);draw(s,R-heavy.widthOfTextAtSize(s,12)-8,y,12,heavy);y-=26;}
  if(!q.taxRegistered)block('Business has selected not to charge tax.',9,font,muted);
  if(invoice&&q.paymentInstructions){y-=12;ensure(45);block('PAYMENT INSTRUCTIONS',10,heavy,accent);block(q.paymentInstructions,9);}
  if(q.terms){y-=12;ensure(45);block('TERMS & CONDITIONS',10,heavy,accent);block(q.terms,9);}
  const pages=pdf.getPages();pages.forEach((p,i)=>{page=p;draw(invoice?'Invoice. Issuer is responsible for applicable tax and invoicing requirements.':'Quotation, not a tax invoice. Please review details and tax treatment.',L,36,8,font,muted);draw(`${i+1} / ${pages.length}`,R-32,36,8,font,muted);if(watermark)p.drawText('PREVIEW ONLY',{x:95,y:350,size:48,font:heavy,color:rgb(.55,.6,.64),opacity:.3,rotate:degrees(30)});});
  pdf.setTitle((invoice?'Invoice ':'Quotation ')+q.reference);pdf.setProducer('Service Pricing Tools');pdf.setCreator('Service Pricing Tools');
  return pdf.save();
}

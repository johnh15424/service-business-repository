const TOOL_CONFIG = {
  'dog-grooming-price-calculator': {
    name: 'Dog Grooming Price Calculator',
    description: 'Estimate a profitable dog grooming price from labour, consumables, overhead and target margin.',
    inputs: [
      ['Base service cost','base',40],['Dog size multiplier','size',1.2],['Extra time (hours)','hours',0.5],['Hourly labour cost','labour',25],['Consumables','materials',5],['Overhead allocation','overhead',8],['Target margin %','margin',35],['Tax %','tax',0],['Minimum charge','minimum',0]
    ],
    cost:v=>(v.base*v.size)+(v.hours*v.labour)+v.materials+v.overhead,
    faq:[['What does target margin mean?','It is the percentage of the final pre-tax selling price you want to retain as gross profit after the costs entered here.'],['Should I include VAT or sales tax?','Use the tax field if you want the calculator to add tax after the pre-tax selling price.'],['Are the default values market rates?','No. They are illustrative defaults only. Replace them with your own business costs and pricing assumptions.']]
  },
  'junk-removal-quote-calculator': {
    name: 'Junk Removal Quote Calculator',
    description: 'Build a junk removal quote from disposal fees, crew time, mileage, overhead and margin.',
    inputs: [['Dump or disposal fee','dump',95],['Crew size','crew',2],['Job hours','hours',2.5],['Hourly labour cost','labour',25],['Travel distance','km',28],['Cost per distance unit','kmp',0.45],['Overhead allocation','overhead',20],['Target margin %','margin',35],['Tax %','tax',0],['Minimum charge','minimum',0]],
    cost:v=>v.dump+(v.crew*v.hours*v.labour)+(v.km*v.kmp)+v.overhead,
    faq:[['Does this include truck volume?','Not directly in V2. Use the disposal fee and minimum charge fields to account for load size, then refine those values for your own operation.'],['Should labour rate include payroll burden?','Yes, ideally. Use a fully loaded labour cost rather than only the employee wage.'],['Can I use miles instead of kilometres?','Yes. The formula only multiplies distance by your cost per distance unit, so it works with either system if you stay consistent.']]
  },
  'mobile-detailing-quote-calculator': {
    name: 'Mobile Detailing Quote Calculator',
    description: 'Calculate a mobile detailing price using package cost, labour, materials, travel and desired margin.',
    inputs: [['Base package cost','base',60],['Labour hours','hours',2],['Hourly labour cost','labour',30],['Consumables','materials',15],['Travel distance','km',20],['Cost per distance unit','kmp',0.45],['Overhead allocation','overhead',12],['Target margin %','margin',35],['Tax %','tax',0],['Minimum charge','minimum',0]],
    cost:v=>v.base+(v.hours*v.labour)+v.materials+(v.km*v.kmp)+v.overhead,
    faq:[['Should I enter the advertised package price as base cost?','No. Enter the internal cost or cost allowance you assign to the package, then let the calculator produce the selling price.'],['How do I account for large vehicles?','Increase labour hours, base cost or consumables for SUVs, vans and heavily soiled vehicles.'],['Can I include travel fees?','Yes. Distance multiplied by your cost per distance unit is included in the cost base.']]
  },
  'pressure-washing-price-calculator': {
    name: 'Pressure Washing Price Calculator',
    description: 'Estimate a pressure washing quote from area, rate, chemicals, labour, overhead and target margin.',
    inputs: [['Area','area',120],['Base cost per area unit','rate',2.5],['Chemicals','chem',20],['Labour hours','hours',3],['Hourly labour cost','labour',25],['Overhead allocation','overhead',15],['Target margin %','margin',35],['Tax %','tax',0],['Minimum charge','minimum',0]],
    cost:v=>(v.area*v.rate)+v.chem+(v.hours*v.labour)+v.overhead,
    faq:[['Can I use square feet instead of square metres?','Yes. The formula is unit-agnostic. Use a matching cost per area unit.'],['Should setup time be included?','Yes. Add setup, packing and cleanup time to labour hours where relevant.'],['How should I handle difficult surfaces?','Increase the base cost per area unit or labour hours for access, staining, steep gradients or delicate materials.']]
  },
  'commercial-cleaning-bid-calculator': {
    name: 'Commercial Cleaning Bid Calculator',
    description: 'Create a recurring commercial cleaning bid from area, productivity, labour, supplies and margin.',
    inputs: [['Area','area',400],['Minutes per 100 area units','mins',35],['Visits per month','visits',8],['Hourly labour cost','labour',18],['Monthly supplies','supplies',80],['Monthly overhead allocation','overhead',100],['Target margin %','margin',30],['Tax %','tax',0],['Minimum monthly charge','minimum',0]],
    cost:v=>{const hrs=(v.area/100*v.mins/60)*v.visits;return(hrs*v.labour)+v.supplies+v.overhead},
    faq:[['What does productivity mean here?','It is the number of minutes required to clean 100 units of area. Adjust it based on building type and service scope.'],['Is the result per visit or per month?','This calculator returns an estimated monthly bid based on the number of visits entered.'],['Should overhead include admin and insurance?','Yes. Allocate a sensible monthly share of insurance, supervision, admin, software and other indirect costs.']]
  }
};

const CURRENCIES={USD:'$',EUR:'€',GBP:'£',CAD:'C$',AUD:'A$'};

function money(n,c){return new Intl.NumberFormat(undefined,{style:'currency',currency:c,maximumFractionDigits:2}).format(n)}
function clampMargin(m){return Math.min(Math.max(m,0),95)}
function calculate(cfg,v){
  const cost=Math.max(0,cfg.cost(v));
  const margin=clampMargin(v.margin||0)/100;
  let preTax=margin>=.95?cost:cost/(1-margin);
  preTax=Math.max(preTax,v.minimum||0);
  const tax=preTax*((v.tax||0)/100);
  const total=preTax+tax;
  const profit=preTax-cost;
  const actualMargin=preTax>0?(profit/preTax)*100:0;
  return {cost,preTax,tax,total,profit,actualMargin};
}

function renderToolPage(){
  const slug=document.body.dataset.tool;
  const cfg=TOOL_CONFIG[slug];
  if(!cfg)return;
  document.title=`${cfg.name} | Service Business Calculators`;
  const desc=document.querySelector('meta[name="description"]'); if(desc) desc.content=cfg.description;
  document.querySelector('[data-tool-title]').textContent=cfg.name;
  document.querySelector('[data-tool-description]').textContent=cfg.description;
  const fields=document.querySelector('[data-fields]');
  cfg.inputs.forEach(([label,key,val])=>{const wrap=document.createElement('label');wrap.innerHTML=`${label}<input type="number" step="any" data-k="${key}" value="${val}">`;fields.appendChild(wrap)});
  const currency=document.querySelector('[data-currency]');
  Object.keys(CURRENCIES).forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;currency.appendChild(o)});
  currency.value='USD';
  const resultEls={quote:document.querySelector('[data-quote]'),cost:document.querySelector('[data-cost]'),pretax:document.querySelector('[data-pretax]'),tax:document.querySelector('[data-tax]'),profit:document.querySelector('[data-profit]'),margin:document.querySelector('[data-margin]')};
  const run=()=>{const v={};fields.querySelectorAll('input').forEach(i=>v[i.dataset.k]=Number(i.value)||0);const r=calculate(cfg,v);const c=currency.value;resultEls.quote.textContent=money(r.total,c);resultEls.cost.textContent=money(r.cost,c);resultEls.pretax.textContent=money(r.preTax,c);resultEls.tax.textContent=money(r.tax,c);resultEls.profit.textContent=money(r.profit,c);resultEls.margin.textContent=`${r.actualMargin.toFixed(1)}%`;};
  document.querySelector('[data-calc]').addEventListener('click',run);currency.addEventListener('change',run);run();
  const faq=document.querySelector('[data-faq]');cfg.faq.forEach(([q,a])=>{const item=document.createElement('div');item.className='faq-item';item.innerHTML=`<strong>${q}</strong><p>${a}</p>`;faq.appendChild(item)});
  const related=document.querySelector('[data-related]');Object.entries(TOOL_CONFIG).filter(([s])=>s!==slug).slice(0,3).forEach(([s,t])=>{const a=document.createElement('a');a.href=`/${s}/`;a.textContent=t.name;related.appendChild(a)});
}

document.addEventListener('DOMContentLoaded',renderToolPage);

// Rates are reference defaults, not a determination of registration or liability.
export const reviewed = '29 September 2026';
export const countries = {
 IE: {name:'Ireland',currency:'EUR',tax:'VAT',rate:23,note:'Revenue classifies dog grooming at the standard rate. Charge VAT only when required for your business and this sale.',url:'https://www.revenue.ie/en/vat/vat-rates/search-vat-rates/D/dog-grooming.aspx',source:'Revenue: dog grooming'},
 GB: {name:'United Kingdom',currency:'GBP',tax:'VAT',rate:20,note:'20% is the standard VAT reference rate. Check your registration and the treatment of your service.',url:'https://www.gov.uk/vat-rates',source:'HMRC: VAT rates'},
 AU: {name:'Australia',currency:'AUD',tax:'GST',rate:10,note:'10% is the standard GST reference rate. Check registration and whether this sale is taxable.',url:'https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst',source:'ATO: GST'},
 CA: {name:'Canada',currency:'CAD',tax:'GST/HST',rate:5,note:'Choose the place-of-supply province. Federal GST/HST defaults do not include separate PST or QST. Add any applicable provincial tax to the editable combined rate after checking its treatment.',url:'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-place-supply.html',source:'CRA: GST/HST rates and place of supply'},
 US: {name:'United States',currency:'USD',tax:'Sales tax',rate:0,note:'No automatic state/local rate is assumed. Check whether grooming is taxable in your jurisdiction and enter the combined applicable rate manually.',url:null,source:null},
 OTHER: {name:'Custom country',currency:'EUR',tax:'Tax',rate:0,note:'Set your currency, tax label and applicable rate. This tool supports a single combined tax rate applied to the pre-tax price.',url:null,source:null}
};
export const provinces = {
 AB:['Alberta',5,'GST'],ON:['Ontario',13,'HST'],NS:['Nova Scotia',14,'HST'],NB:['New Brunswick',15,'HST'],NL:['Newfoundland and Labrador',15,'HST'],PE:['Prince Edward Island',15,'HST'],BC:['British Columbia (GST only)',5,'GST'],MB:['Manitoba (GST only)',5,'GST'],SK:['Saskatchewan (GST only)',5,'GST'],QC:['Quebec (GST only; check QST)',5,'GST'],NT:['Northwest Territories',5,'GST'],NU:['Nunavut',5,'GST'],YT:['Yukon',5,'GST']
};
// Duration, product cost, wear and minimum examples from the existing workbook.
// These examples are not converted/local market prices when currency changes.
export const services = {
 full:{name:'Full groom',minutes:[75,105,135,165],consumables:[5,6.5,9,11],wear:[2.5,3,4,5],minimum:[55,70,95,115],note:'Bath, dry and clip/scissor finish. Check the cut and coat with the owner before quoting.'},
 bath:{name:'Bath & brush',minutes:[45,60,75,95],consumables:[4,5.5,7.5,9],wear:[1.5,1.75,2.25,3],minimum:[35,45,60,75],note:'Routine bathing, drying and brushing. Dense undercoats may need extra drying time.'},
 shed:{name:'Deshedding treatment',minutes:[60,90,120,150],consumables:[6,8,10,12],wear:[2,2.5,3,4],minimum:[50,65,85,105],note:'Allow for coat release, appropriate products and drying. Confirm suitability for the individual coat.'},
 puppy:{name:'Puppy introduction',minutes:[30,45,50,60],consumables:[2.5,3.5,4,4.5],wear:[1,1,1.25,1.5],minimum:[30,35,40,45],note:'A short familiarisation appointment. Plan breaks and agree a limited scope with the owner.'},
 nails:{name:'Nail trim',minutes:[15,15,20,20],consumables:[.75,.75,1,1],wear:[.5,.5,.75,.75],minimum:[12,12,15,15],note:'Standalone nail care. Add handling time where required; no coat-time suggestion is applied.'},
 strip:{name:'Hand stripping',minutes:[120,150,180,210],consumables:[4,4.5,5.5,6.5],wear:[3,3.5,4,5],minimum:[90,110,140,165],note:'Specialist work. Base the time on coat suitability and your own experience; price is not a suitability assessment.'}
};
export function example(service,size,coat,condition) {
 const s=services[service];
 if(!s || !Number.isInteger(size) || size<0 || size>3) throw new Error('Choose a valid service and dog size.');
 const c=s.consumables[size];
 return {baseMinutes:s.minutes[size],coatMinutes:service==='nails'?0:({short:0,long:10,curly:15,double:20,wire:10}[coat]||0)+({maintained:0,tangled:15,matted:30}[condition]||0),shampoo:service==='nails'?0:Math.round(c*.4*100)/100,conditioner:service==='nails'?0:Math.round(c*.25*100)/100,specialist:service==='nails'?c:Math.round((c-Math.round(c*.4*100)/100-Math.round(c*.25*100)/100)*100)/100,wear:s.wear[size],minimum:s.minimum[size]};
}

export const reviewed='30 September 2026';
export const countries={
 IE:{name:'Ireland',currency:'EUR',tax:'VAT',rate:23,note:'23% is the standard VAT reference rate from 1 January 2026. Confirm registration and the treatment of this service.',url:'https://www.revenue.ie/en/vat/vat-rates/search-vat-rates/current-VAT-rates.aspx',source:'Revenue: current VAT rates'},
 GB:{name:'United Kingdom',currency:'GBP',tax:'VAT',rate:20,note:'20% is the standard VAT reference rate. Confirm registration and whether the work is standard-rated.',url:'https://www.gov.uk/vat-rates',source:'HMRC: VAT rates'},
 AU:{name:'Australia',currency:'AUD',tax:'GST',rate:10,note:'10% is the standard GST reference rate. Confirm registration and whether the sale is taxable.',url:'https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst',source:'ATO: GST'},
 NZ:{name:'New Zealand',currency:'NZD',tax:'GST',rate:15,note:'15% is the standard GST reference rate. Confirm registration and whether the sale is taxable.',url:'https://www.ird.govt.nz/gst/charging-gst',source:'Inland Revenue: GST'},
 CA:{name:'Canada',currency:'CAD',tax:'GST/HST',rate:5,note:'Choose the place-of-supply province. Separate PST or QST may also apply.',url:'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-place-supply.html',source:'CRA: GST/HST place of supply'},
 US:{name:'United States',currency:'USD',tax:'Sales tax',rate:0,note:'No automatic state or local rate is assumed. Check whether the service is taxable where supplied and enter the combined applicable rate manually.',url:null,source:null},
 OTHER:{name:'Custom country / region',currency:'EUR',tax:'Tax',rate:0,note:'Choose a currency and enter the tax label and rate manually. A single combined tax rate is supported.',url:null,source:null}
};
export const provinces={
 AB:['Alberta',5,'GST'],ON:['Ontario',13,'HST'],NS:['Nova Scotia',14,'HST'],NB:['New Brunswick',15,'HST'],NL:['Newfoundland and Labrador',15,'HST'],PE:['Prince Edward Island',15,'HST'],BC:['British Columbia (GST only)',5,'GST'],MB:['Manitoba (GST only)',5,'GST'],SK:['Saskatchewan (GST only)',5,'GST'],QC:['Quebec (GST only; check QST)',5,'GST'],NT:['Northwest Territories',5,'GST'],NU:['Nunavut',5,'GST'],YT:['Yukon',5,'GST']
};
export const currencies=['EUR','GBP','USD','CAD','AUD','NZD','CHF','SEK','NOK','DKK','PLN','ZAR','SGD','JPY','AED'];
export const jobs={
 driveway:{name:'Driveway',area:100,crew:1,workHours:3,setupHours:.75,chemicals:18,utilities:8,wear:15,fuel:8,minimum:120},
 patio:{name:'Patio',area:60,crew:1,workHours:2.5,setupHours:.6,chemicals:15,utilities:7,wear:12,fuel:6,minimum:110},
 decking:{name:'Decking',area:40,crew:1,workHours:2,setupHours:.6,chemicals:12,utilities:6,wear:10,fuel:5,minimum:100},
 paths:{name:'Paths / walkways',area:80,crew:1,workHours:2.5,setupHours:.6,chemicals:15,utilities:7,wear:12,fuel:6,minimum:110},
 facade:{name:'Walls / facade',area:70,crew:2,workHours:3,setupHours:1,chemicals:22,utilities:10,wear:18,fuel:10,minimum:180},
 commercial:{name:'Commercial area',area:300,crew:2,workHours:5,setupHours:1,chemicals:45,utilities:18,wear:30,fuel:17,minimum:300},
 other:{name:'Other',area:100,crew:1,workHours:3,setupHours:.75,chemicals:18,utilities:8,wear:15,fuel:8,minimum:120}
};

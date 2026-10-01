export const reviewed='1 October 2026';
export const countries={
 IE:{name:'Ireland',currency:'EUR',tax:'VAT',rate:23,note:'23% is the standard VAT reference rate from 1 January 2026. Confirm registration and whether the service is taxable.',url:'https://www.revenue.ie/en/vat/vat-rates/search-vat-rates/current-VAT-rates.aspx',source:'Revenue: current VAT rates'},
 GB:{name:'United Kingdom',currency:'GBP',tax:'VAT',rate:20,note:'20% is the standard VAT reference rate. Confirm registration and whether the work is standard-rated.',url:'https://www.gov.uk/vat-rates',source:'HMRC: VAT rates'},
 AU:{name:'Australia',currency:'AUD',tax:'GST',rate:10,note:'10% is the standard GST reference rate. Confirm registration and taxability.',url:'https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst',source:'ATO: GST'},
 NZ:{name:'New Zealand',currency:'NZD',tax:'GST',rate:15,note:'15% is the standard GST reference rate. Confirm registration and taxability.',url:'https://www.ird.govt.nz/gst/charging-gst',source:'Inland Revenue: GST'},
 CA:{name:'Canada',currency:'CAD',tax:'GST/HST',rate:5,note:'Choose the place-of-supply province. Separate PST or QST may also apply.',url:'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-place-supply.html',source:'CRA: GST/HST place of supply'},
 US:{name:'United States',currency:'USD',tax:'Sales tax',rate:0,note:'No automatic state or local rate is assumed. Enter the applicable combined rate manually if the service is taxable.',url:null,source:null},
 OTHER:{name:'Custom country / region',currency:'EUR',tax:'Tax',rate:0,note:'Choose a currency and enter the tax label and rate manually.',url:null,source:null}
};
export const provinces={AB:['Alberta',5,'GST'],ON:['Ontario',13,'HST'],NS:['Nova Scotia',14,'HST'],NB:['New Brunswick',15,'HST'],NL:['Newfoundland and Labrador',15,'HST'],PE:['Prince Edward Island',15,'HST'],BC:['British Columbia (GST only)',5,'GST'],MB:['Manitoba (GST only)',5,'GST'],SK:['Saskatchewan (GST only)',5,'GST'],QC:['Quebec (GST only; check QST)',5,'GST'],NT:['Northwest Territories',5,'GST'],NU:['Nunavut',5,'GST'],YT:['Yukon',5,'GST']};
export const currencies=['EUR','GBP','USD','CAD','AUD','NZD','CHF','SEK','NOK','DKK','PLN','ZAR','SGD','JPY','AED'];
export const jobs={
 standard:{name:'Standard home clean',hours:3,cleaners:1,supplies:8,laundry:0,travelHours:.5,minimum:75},
 deep:{name:'Deep clean',hours:5,cleaners:2,supplies:18,laundry:0,travelHours:.5,minimum:180},
 move:{name:'Move-in / move-out clean',hours:6,cleaners:2,supplies:22,laundry:0,travelHours:.5,minimum:220},
 recurring:{name:'Recurring maintenance clean',hours:2.5,cleaners:1,supplies:6,laundry:0,travelHours:.4,minimum:65},
 airbnb:{name:'Short-stay / Airbnb turnover',hours:2.5,cleaners:1,supplies:8,laundry:12,travelHours:.4,minimum:80},
 commercial:{name:'Small commercial clean',hours:4,cleaners:2,supplies:15,laundry:0,travelHours:.5,minimum:160},
 other:{name:'Other cleaning job',hours:3,cleaners:1,supplies:8,laundry:0,travelHours:.5,minimum:75}
};

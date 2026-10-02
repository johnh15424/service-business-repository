// Shared localisation layer for Service Pricing Tools.
// Currency and a reviewed tax reference can be prefilled. Tax stays OFF until the user confirms they charge it.
// Service-specific calculator profiles override these defaults when a different reviewed treatment applies.
export const globalReviewed='2 October 2026';
const rows=`AE|United Arab Emirates|AED
AR|Argentina|ARS
AT|Austria|EUR
AU|Australia|AUD
BE|Belgium|EUR
BG|Bulgaria|BGN
BH|Bahrain|BHD
BO|Bolivia|BOB
BR|Brazil|BRL
CA|Canada|CAD
CH|Switzerland|CHF
CL|Chile|CLP
CN|China|CNY
CO|Colombia|COP
CR|Costa Rica|CRC
CY|Cyprus|EUR
CZ|Czechia|CZK
DE|Germany|EUR
DK|Denmark|DKK
DO|Dominican Republic|DOP
DZ|Algeria|DZD
EC|Ecuador|USD
EE|Estonia|EUR
EG|Egypt|EGP
ES|Spain|EUR
FI|Finland|EUR
FR|France|EUR
GB|United Kingdom|GBP
GH|Ghana|GHS
GR|Greece|EUR
GT|Guatemala|GTQ
HK|Hong Kong|HKD
HR|Croatia|EUR
HU|Hungary|HUF
ID|Indonesia|IDR
IE|Ireland|EUR
IL|Israel|ILS
IN|India|INR
IS|Iceland|ISK
IT|Italy|EUR
JP|Japan|JPY
KE|Kenya|KES
KR|South Korea|KRW
KW|Kuwait|KWD
KZ|Kazakhstan|KZT
LT|Lithuania|EUR
LU|Luxembourg|EUR
LV|Latvia|EUR
MA|Morocco|MAD
MT|Malta|EUR
MX|Mexico|MXN
MY|Malaysia|MYR
NG|Nigeria|NGN
NL|Netherlands|EUR
NO|Norway|NOK
NZ|New Zealand|NZD
OM|Oman|OMR
PA|Panama|PAB
PE|Peru|PEN
PH|Philippines|PHP
PK|Pakistan|PKR
PL|Poland|PLN
PT|Portugal|EUR
QA|Qatar|QAR
RO|Romania|RON
RS|Serbia|RSD
SA|Saudi Arabia|SAR
SE|Sweden|SEK
SG|Singapore|SGD
SI|Slovenia|EUR
SK|Slovakia|EUR
TH|Thailand|THB
TR|Türkiye|TRY
TW|Taiwan|TWD
TZ|Tanzania|TZS
UA|Ukraine|UAH
UG|Uganda|UGX
US|United States|USD
UY|Uruguay|UYU
VN|Vietnam|VND
ZA|South Africa|ZAR`;

// Reviewed high-priority defaults. These are reference rates only; registration, thresholds,
// local taxes and service-specific reduced rates can change the amount actually chargeable.
const reviewedTaxDefaults={
 IE:{tax:'VAT',rate:23,note:'23% is the standard Irish VAT reference rate. This calculator may use a service-specific override where reviewed. Only charge VAT when required for the business and service.',url:'https://www.revenue.ie/en/vat/vat-rates/search-vat-rates/current-VAT-rates.aspx',source:'Revenue',confidence:'standard-reference'},
 GB:{tax:'VAT',rate:20,note:'20% is the standard UK VAT reference rate. Confirm registration and the VAT treatment of the service before quoting.',url:'https://www.gov.uk/vat-rates',source:'HMRC',confidence:'standard-reference'},
 AU:{tax:'GST',rate:10,note:'10% is the standard Australian GST reference rate. Confirm GST registration and that the service is taxable.',url:'https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst',source:'ATO',confidence:'standard-reference'},
 NZ:{tax:'GST',rate:15,note:'15% is the standard New Zealand GST reference rate. Confirm GST registration and taxability.',url:'https://www.ird.govt.nz/gst/charging-gst',source:'Inland Revenue',confidence:'standard-reference'},
 CA:{tax:'GST/HST',rate:5,note:'5% is the federal GST reference rate. HST and provincial taxes depend on the place of supply, so select or enter the applicable local rate where available.',url:'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-place-supply.html',source:'CRA',confidence:'regional-required'},
 US:{tax:'Sales tax',rate:0,note:'US service sales tax varies by state and locality. No national rate is assumed; enter the applicable combined rate if this service is taxable.',url:null,source:null,confidence:'manual'}
};

export const globalCountries=Object.fromEntries(rows.split('\n').map(r=>{
 const [code,name,currency]=r.split('|');
 const reviewed=reviewedTaxDefaults[code];
 return [code,{name,currency,tax:reviewed?.tax||'Tax',rate:reviewed?.rate??0,note:reviewed?.note||'Currency loaded. A country-wide tax rate is not prefilled here because service treatment, registration thresholds or local rates may vary. Enter the applicable rate after checking your jurisdiction.',url:reviewed?.url||null,source:reviewed?.source||null,confidence:reviewed?.confidence||'manual-tax'}];
}));

export const globalCurrencies=[...new Set(Object.values(globalCountries).map(x=>x.currency))].sort();
export function mergeCountries(reviewedProfiles={}){
 return {...globalCountries,...reviewedProfiles,OTHER:{name:'Other / custom country',currency:'USD',tax:'Tax',rate:0,note:'Choose your currency and enter the applicable tax manually.',url:null,source:null,confidence:'manual'}};
}
export function populateCountrySelect(select,countries,preferred='IE'){
 const existing=select.value;select.replaceChildren();
 for(const [code,p] of Object.entries(countries).sort((a,b)=>a[1].name.localeCompare(b[1].name))){const o=document.createElement('option');o.value=code;o.textContent=p.name;select.append(o)}
 select.value=countries[existing]?existing:(countries[preferred]?preferred:'OTHER');
}

// Progressive enhancement for factory calculators that do not have their own service-specific tax profile.
// The calculator still decides whether tax is charged; this only supplies the suggested rate and clearer copy.
function applySuggestedTax(){
 const country=document.getElementById('country');
 const taxRate=document.getElementById('taxRate');
 if(!country||!taxRate||document.getElementById('taxLabel'))return;
 const profile=globalCountries[country.value]||globalCountries.IE;
 if(profile && Number.isFinite(Number(profile.rate))) taxRate.value=profile.rate;
 const label=document.querySelector('label[for="taxRate"]');
 if(label) label.textContent='Suggested tax rate (%)';
}

const countrySelect=document.getElementById('country');
if(countrySelect){
 populateCountrySelect(countrySelect,mergeCountries(),countrySelect.value||'IE');
 countrySelect.addEventListener('change',()=>setTimeout(applySuggestedTax,0));
 setTimeout(applySuggestedTax,0);
}

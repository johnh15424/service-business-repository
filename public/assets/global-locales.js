// Shared localisation layer for Service Pricing Tools.
// Currency is safe to prefill. Tax, wage and utility figures are only auto-filled where a calculator has a reviewed jurisdiction profile.
// For all other countries tax remains OFF and editable: do not infer tax liability from geography alone.
export const globalReviewed='1 October 2026';
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
export const globalCountries=Object.fromEntries(rows.split('\n').map(r=>{const [code,name,currency]=r.split('|');return [code,{name,currency,tax:'Tax',rate:0,note:'Currency loaded for this country. Tax is not auto-applied because service tax rules, registration thresholds and local rates can vary. Enter the applicable tax only after checking your jurisdiction.',url:null,source:null,confidence:'currency-only'}]}));
export const globalCurrencies=[...new Set(Object.values(globalCountries).map(x=>x.currency))].sort();
export function mergeCountries(reviewedProfiles={}){return {...globalCountries,...reviewedProfiles,OTHER:{name:'Other / custom country',currency:'USD',tax:'Tax',rate:0,note:'Choose your currency and enter any applicable tax manually. Local wage and utility assumptions are not inferred without a reviewed source.',url:null,source:null,confidence:'manual'}}}
export function populateCountrySelect(select,countries,preferred='IE'){
 const existing=select.value;select.replaceChildren();
 for(const [code,p] of Object.entries(countries).sort((a,b)=>a[1].name.localeCompare(b[1].name))){const o=document.createElement('option');o.value=code;o.textContent=p.name;select.append(o)}
 select.value=countries[existing]?existing:(countries[preferred]?preferred:'OTHER');
}

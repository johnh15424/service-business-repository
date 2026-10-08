import {execFileSync} from 'node:child_process';
for(const f of ['public/assets/quote-model.js','public/assets/quote-logo.js','public/assets/quote-preview.js','public/assets/quote-download.js','src/quote-pdf.js','src/quote-paypal.js','src/quote-api.js','src/worker.js'])execFileSync(process.execPath,['--check',f],{stdio:'inherit'});

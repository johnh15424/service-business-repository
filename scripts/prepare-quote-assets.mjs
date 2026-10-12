import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('public/assets/vendor',{recursive:true});
for(const n of ['pdf.mjs','pdf.worker.mjs'])await copyFile('node_modules/pdfjs-dist/legacy/build/'+n,'public/assets/vendor/'+n);
await copyFile('node_modules/pdfjs-dist/LICENSE','public/assets/vendor/PDFJS-LICENSE.txt');
await mkdir('public/assets/fonts',{recursive:true});
for(const n of ['DejaVuSans.ttf','DejaVuSans-Bold.ttf'])await copyFile('node_modules/dejavu-fonts-ttf/ttf/'+n,'public/assets/fonts/'+n);
await copyFile('node_modules/dejavu-fonts-ttf/LICENSE','public/assets/fonts/LICENCE.txt');

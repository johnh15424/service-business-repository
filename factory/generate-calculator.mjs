import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import windowCleaning from './niches/window-cleaning.js';
import carpetCleaning from './niches/carpet-cleaning.js';
import handyman from './niches/handyman.js';
import paintingDecorating from './niches/painting-decorating.js';
import gutterCleaning from './niches/gutter-cleaning.js';

// Factory niches only. These pages mount #factory-root and are driven at runtime by
// /assets/factory-calculator.js, which renders the form, the results and the paid-first
// commercial block from the embedded niche-config plus niche-registry.js.
//
// Pages served by a legacy runtime (dog grooming, house cleaning, lawn care, mobile car
// detailing, pressure washing) are hand-maintained and deliberately NOT generated here.
export const factoryConfigs = [windowCleaning, carpetCleaning, handyman, paintingDecorating, gutterCleaning];
const root = process.cwd();

// Config-authored copy is emitted as written so generated pages stay byte-identical to the
// committed ones (titles and eyebrows contain bare "&"). Keep config strings free of markup.
const raw = (value = '') => String(value);

// The embedded config is deliberately a subset: no seo/status block, and products are null so
// factory-calculator.js resolves the live Payhip URLs from niche-registry.js instead.
function runtimeConfig(config) {
  return {
    id: config.id,
    name: config.name,
    category: config.category,
    slug: config.slug,
    copy: { resultEyebrow: config.copy.resultEyebrow },
    jobTypes: config.jobTypes,
    directCostFields: config.directCostFields,
    defaults: config.defaults,
    products: { freeUrl: null, proUrl: null, proPrice: config.products.proPrice }
  };
}

export function renderPage(config) {
  const json = JSON.stringify(runtimeConfig(config)).replace(/</g, '\\u003c');
  const headlineLead = config.copy.headline.replace(/\s*price calculator\.$/i, '');
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${raw(config.seo.title)}</title><meta name="description" content="${raw(config.seo.description)}"><link rel="canonical" href="https://servicepricingtools.com/${raw(config.slug)}/"><link rel="icon" href="/assets/paw.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/styles.css"></head><body><header><nav class="wrap nav"><a class="brand" href="/"><img src="/assets/paw.svg" alt="" width="32" height="32">Service Pricing <span>Tools</span></a><div><a href="/#calculators">Calculators</a><a href="/#resources">Resources</a></div></nav></header><a href="#estimate" id="quick-estimate" class="quick-estimate">View estimate</a><main><section class="wrap hero"><p class="eyebrow">${raw(config.copy.eyebrow)}</p><h1>${raw(headlineLead)}<br><em>price calculator.</em></h1><p class="lead">${raw(config.copy.lead)}</p></section><div id="factory-root" class="wrap"></div></main><script id="niche-config" type="application/json">${json}</script><script type="module" src="/assets/factory-calculator.js"></script><footer class="wrap footer"><a class="brand" href="/">Service Pricing Tools</a><p>${raw(config.copy.footerNote)}</p></footer></body></html>`;
}

// Niches the generator will actually write, in generation order.
export const generatedNiches = () => factoryConfigs.filter(config => config.status === 'live');

export async function writePages() {
  for (const config of factoryConfigs) {
    if (config.status !== 'live') {
      console.log(`skipped ${config.slug} (status: ${config.status})`);
      continue;
    }
    const directory = path.join(root, 'public', config.slug);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, 'index.html'), renderPage(config));
    console.log(`generated ${config.slug}`);
  }
}

// Only write when run directly (npm run generate). Importing this module — as the drift test
// does — must never touch public/.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await writePages();
}

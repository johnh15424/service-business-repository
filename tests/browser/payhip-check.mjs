// Read-only check of every Payhip product the site links to: public product pages only, no cart, no order.
//   node tests/browser/payhip-check.mjs [--json out.json]
// Fails when a product page is missing or a toolkit does not show €24.99; free checklists must not show a price.
import { writeFileSync } from 'node:fs';
import { nicheRegistry } from '../../public/assets/niche-registry.js';

const rows = [];
const meta = (html, prop) => html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)`, 'i'))?.[1] ?? null;
for (const n of nicheRegistry.filter(n => n.freeUrl || n.proUrl)) {
  for (const [kind, url] of [['free', n.freeUrl], ['toolkit', n.proUrl]]) {
    if (!url) continue;
    let status = 0, title = null, price = null, currency = null, html = '';
    try {
      const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (ServicePricingTools link check)' } });
      status = r.status; html = await r.text();
      title = (meta(html, 'og:title') || html.match(/<title>([^<]*)/i)?.[1] || '').trim();
      price = meta(html, 'product:price:amount') || meta(html, 'og:price:amount') || html.match(/"price"\s*:\s*"?([0-9.]+)/)?.[1] || null;
      currency = meta(html, 'product:price:currency') || meta(html, 'og:price:currency') || html.match(/"priceCurrency"\s*:\s*"([A-Z]{3})"/)?.[1] || null;
    } catch (e) { title = 'fetch failed: ' + e.message; }
    const problems = [];
    if (status !== 200) problems.push('HTTP ' + status);
    if (kind === 'toolkit' && price !== null && Number(price) !== 24.99) problems.push('toolkit price ' + price);
    if (kind === 'toolkit' && price === null && !/24[.,]99/.test(html)) problems.push('toolkit price not found');
    if (kind === 'free' && price !== null && Number(price) > 0) problems.push('free checklist priced ' + price);
    const nameWord = n.name.split(/[ &]/)[0].toLowerCase();
    if (status === 200 && title && !title.toLowerCase().includes(nameWord)) problems.push('title does not name ' + n.name);
    rows.push({ niche: n.id, kind, url, status, title, price, currency, problems });
  }
}
for (const r of rows) console.log(`${r.problems.length ? 'FAIL' : 'ok  '} ${r.niche.padEnd(22)} ${r.kind.padEnd(8)} ${r.status} ${r.price ?? '-'} ${r.currency ?? ''} "${(r.title || '').slice(0, 70)}" ${r.problems.join('; ')}`);
const bad = rows.filter(r => r.problems.length);
console.log(`\n${rows.length - bad.length}/${rows.length} Payhip product pages verified`);
if (process.argv.includes('--json')) writeFileSync(process.argv[process.argv.indexOf('--json') + 1], JSON.stringify(rows, null, 1));
process.exit(bad.some(r => r.status !== 200) ? 1 : 0);

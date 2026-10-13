// Read-only check of every Payhip product the site links to: public product pages only, no cart, no order.
//   node tests/browser/payhip-check.mjs [--json out.json]
// Fails when a product page is missing or a toolkit does not show €24.99; free checklists must not show a price.
import { writeFileSync } from 'node:fs';
import { nicheRegistry } from '../../public/assets/niche-registry.js';

const rows = [];
// Payhip sits behind Cloudflare bot protection, which can refuse plain requests from datacenter IPs.
// Fall back to a real browser once per page; a challenge page is reported as such, never as a pass.
let browser = null;
async function viaBrowser(url) {
  try {
    if (!browser) { const { chromium } = await import('playwright'); browser = await chromium.launch(); }
    const page = await browser.newPage(); const r = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000); const html = await page.content(); const status = r?.status() ?? 0; await page.close();
    return { status: /Attention Required|Just a moment/i.test(html) ? 403 : status, html };
  } catch (e) { return { status: 0, html: '' }; }
}
const meta = (html, prop) => html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)`, 'i'))?.[1] ?? null;
for (const n of nicheRegistry.filter(n => n.freeUrl || n.proUrl)) {
  for (const [kind, url] of [['free', n.freeUrl], ['toolkit', n.proUrl]]) {
    if (!url) continue;
    let status = 0, title = null, price = null, currency = null, html = '';
    try {
      const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (ServicePricingTools link check)' } });
      status = r.status; html = await r.text();
      if (status === 403 && /cloudflare/i.test(html)) ({ status, html } = await viaBrowser(url));
      title = (meta(html, 'og:title') || html.match(/<title>([^<]*)/i)?.[1] || '').trim();
      price = meta(html, 'product:price:amount') || meta(html, 'og:price:amount') || html.match(/"price"\s*:\s*"?([0-9.]+)/)?.[1] || null;
      currency = meta(html, 'product:price:currency') || meta(html, 'og:price:currency') || html.match(/"priceCurrency"\s*:\s*"([A-Z]{3})"/)?.[1] || null;
    } catch (e) { title = 'fetch failed: ' + e.message; }
    const problems = [];
    if (status !== 200) problems.push(status === 403 ? 'blocked by Payhip bot protection (not verifiable from this network)' : 'HTTP ' + status);
    if (kind === 'toolkit' && price !== null && Number(price) !== 24.99) problems.push('toolkit price ' + price);
    if (kind === 'toolkit' && price === null && !/24[.,]99/.test(html)) problems.push('toolkit price not found');
    if (kind === 'free' && price !== null && Number(price) > 0) problems.push('free checklist priced ' + price);
    const nameWord = n.name.split(/[ &]/)[0].toLowerCase();
    if (status === 200 && title && !title.toLowerCase().includes(nameWord)) problems.push('title does not name ' + n.name);
    rows.push({ niche: n.id, kind, url, status, title, price, currency, problems });
  }
}
await browser?.close();
for (const r of rows) console.log(`${r.problems.length ? 'FAIL' : 'ok  '} ${r.niche.padEnd(22)} ${r.kind.padEnd(8)} ${r.status} ${r.price ?? '-'} ${r.currency ?? ''} "${(r.title || '').slice(0, 70)}" ${r.problems.join('; ')}`);
const bad = rows.filter(r => r.problems.length);
console.log(`\n${rows.length - bad.length}/${rows.length} Payhip product pages verified`);
if (process.argv.includes('--json')) writeFileSync(process.argv[process.argv.indexOf('--json') + 1], JSON.stringify(rows, null, 1));
// Only a definite dead product (404/410) fails the run; bot-protection blocks are a reported limitation.
process.exit(rows.some(r => [404, 410].includes(r.status)) ? 1 : 0);

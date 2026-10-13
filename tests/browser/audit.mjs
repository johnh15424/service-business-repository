// Real-browser audit of every calculator page against a running local preview
// (scripts/quote-dev-server.mjs, optionally with QUOTE_DEV_CHECKOUT=mock).
//
//   node tests/browser/audit.mjs [baseUrl] [--json out.json]
//
// It emulates the production Worker's head injection (site-analytics.js and the Google tag) so funnel
// events and consent handling are exercised, but blocks every request to Google, PayPal and Payhip:
// nothing leaves the machine. Exit code is non-zero when any page fails a hard check.
import { chromium, devices } from 'playwright';
import { writeFileSync } from 'node:fs';
import { nicheRegistry } from '../../public/assets/niche-registry.js';

const args = process.argv.slice(2);
const base = (args.find(a => /^https?:/.test(a)) || 'http://127.0.0.1:8081').replace(/\/$/, '');
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
// --deployed: audit a real Worker (branch preview or production) as served, without emulating its head
// injection. --expect-tag says whether that host must load the Google tag (production) or must not (preview).
// --expect-quote=hidden is for hosts where checkout is intentionally off (previews never take payments).
const deployed = args.includes('--deployed');
const expectTag = args.includes('--expect-tag') ? args[args.indexOf('--expect-tag') + 1] === 'yes' : null;
const quoteHidden = args.includes('--expect-quote=hidden');
const VIEWPORTS = {
  iphone: devices['iPhone 13'],
  android: devices['Pixel 7'],
  tablet: { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1366, height: 900 } }
};
// What the production Worker injects on servicepricingtools.com. On this local host site-analytics.js holds
// every gtag() call in window.sptAnalyticsSuppressed instead of sending it, which is what is asserted on.
const HEAD = '<script src="/assets/site-analytics.js"></script><script async src="https://www.googletagmanager.com/gtag/js?id=G-J3BBT6YZRB"></script>';
const pages = nicheRegistry.filter(n => n.status === 'live' || n.calculatorLive).filter(n => !only || only.includes(n.id));

async function auditPage(browser, niche, vpName) {
  const ctx = await browser.newContext({ ...VIEWPORTS[vpName], serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const out = { niche: niche.id, viewport: vpName, errors: [], warnings: [], events: [] };
  page.on('pageerror', e => out.errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_BLOCKED|ERR_FAILED|net::/.test(m.text())) out.errors.push('console: ' + m.text()); });
  out.tagRequests = 0;
  await page.route(/googletagmanager|google-analytics|paypal|payhip/, r => { if (/googletagmanager|google-analytics/.test(r.request().url())) out.tagRequests++; return r.abort('blockedbyclient'); });
  if (!deployed) await page.route(u => u.origin === base && /\.html$|\/$/.test(u.pathname), async r => {
    const res = await r.fetch(); const body = (await res.text()).replace('<head>', '<head>' + HEAD);
    await r.fulfill({ response: res, body, headers: { ...res.headers(), 'content-type': 'text/html' } });
  });
  await page.addInitScript(() => {
    window.__events = [];
    const push = d => { try { window.__events.push(JSON.parse(JSON.stringify(d))); } catch {} };
    for (const t of ['calculator:conversion', 'commercial:conversion', 'funnel:conversion', 'quote:conversion']) window.addEventListener(t, e => push({ channel: t, ...e.detail }));
  });
  const resp = await page.goto(base + niche.calculatorPath, { waitUntil: 'networkidle' });
  out.status = resp?.status();
  const consent = page.locator('#spt-consent button', { hasText: 'Reject' });
  out.consentBanner = await consent.count() > 0;
  if (out.consentBanner) await consent.click();
  const info = await page.evaluate(() => {
    const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('[hidden]'); };
    const text = document.body.innerText;
    const links = [...document.querySelectorAll('a[href]')].map(a => ({ href: a.getAttribute('href'), text: a.textContent.trim().slice(0, 80), free: a.hasAttribute('data-free-cta') || a.hasAttribute('data-commercial-free'), paid: a.hasAttribute('data-paid-cta') || a.hasAttribute('data-commercial-paid'), visible: vis(a) }));
    const quoteBtn = document.querySelector('[data-quote-open], .quote-entry button');
    const hero = document.querySelector('[data-result="hero"]');
    const firstScreen = el => { if (!vis(el)) return false; const r = el.getBoundingClientRect(); return r.top + window.scrollY < window.innerHeight * 1.5; };
    return {
      title: document.title,
      h1: document.querySelector('h1')?.textContent.trim(),
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      heroPrice: hero?.textContent.trim(),
      comingSoon: /coming soon|being prepared|products being prepared/i.test(text),
      emDash: /—/.test([...document.querySelectorAll('main p, main h1, main h2, main h3, main a, main button, main li')].filter(vis).map(n => n.textContent).join(' ').replace(/^—$/gm, '')),
      quoteButton: quoteBtn ? { text: quoteBtn.textContent.trim(), visible: vis(quoteBtn), nearTop: firstScreen(quoteBtn) } : null,
      paidLinks: links.filter(l => l.paid), freeLinks: links.filter(l => l.free),
      internal: [...new Set(links.map(l => l.href).filter(h => h.startsWith('/') && !h.startsWith('//')))],
      prices: [...new Set((text.match(/€\s?\d+(?:[.,]\d{2})?/g) || []).map(s => s.replace(/\s/g, '')))]
    };
  });
  Object.assign(out, info);
  if (out.status !== 200) out.errors.push('HTTP ' + out.status);
  if (out.overflowX > 1) out.errors.push(`horizontal overflow ${out.overflowX}px`);
  if (!out.heroPrice || out.heroPrice === '—') out.errors.push('no estimate shown on load');
  if (out.comingSoon) out.errors.push('"coming soon" style placeholder visible');
  for (const l of out.paidLinks) if (niche.proUrl && !l.href.includes(niche.proUrl.split('/').pop())) out.errors.push('paid link to wrong product: ' + l.href);
  for (const l of out.freeLinks) if (niche.freeUrl && !l.href.includes(niche.freeUrl.split('/').pop())) out.errors.push('free link to wrong product: ' + l.href);
  if (!niche.proUrl && out.paidLinks.length) out.errors.push('paid toolkit offered without a product');
  if (niche.freeUrl && !out.freeLinks.some(l => l.visible)) out.warnings.push('matching free checklist not visible');
  if (niche.proUrl && !out.paidLinks.some(l => l.visible)) out.warnings.push('matching toolkit not visible');
  if (out.prices.some(p => !/^€(4(\.00)?|24\.99)$/.test(p))) out.warnings.push('unexpected € price text: ' + out.prices.join(' '));

  // Example then a real recalculation.
  const example = page.locator('#apply-example, [data-apply-example]').first();
  out.example = await example.count() > 0;
  if (out.example) await example.click();
  const before = await page.locator('[data-result="hero"]').first().textContent();
  const hours = page.locator('#workHours, #hours, #baseMinutes').first();
  if (await hours.count()) { await hours.fill(String(Number(await hours.inputValue() || 1) + 1)); await hours.dispatchEvent('input'); }
  const submit = page.locator('form button[type="submit"]').first();
  if (await submit.count()) await submit.click();
  const after = await page.locator('[data-result="hero"]').first().textContent();
  out.recalculated = before !== after;
  if (!out.recalculated) out.warnings.push('estimate did not change after editing hours');

  if (expectTag === true && !out.tagRequests) out.errors.push('production host did not request the Google tag');
  if (expectTag === false && out.tagRequests) out.errors.push(`non-production host requested Google tag/collection ${out.tagRequests} times`);
  // Quote generator with calculator context.
  await page.waitForTimeout(300);
  const open = page.locator('[data-quote-open], .quote-entry button').first();
  if (quoteHidden) {
    if (await page.locator('[data-quote-open]:visible').count()) out.errors.push('€4 offer visible on a host where checkout must be off');
  } else if (await open.count() && await open.isVisible()) {
    await open.scrollIntoViewIfNeeded();
    const box = await open.boundingBox();
    const covered = await page.evaluate(({ x, y }) => { const t = document.elementFromPoint(x, y); return t && !t.closest('[data-quote-open], .quote-entry button') ? (t.id || t.className || t.tagName) : null; }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
    if (covered) out.errors.push('quote CTA obscured by ' + covered);
    await open.click();
    const dlg = page.locator('#spt-quote-preview');
    out.quoteOpened = await dlg.isVisible();
    if (out.quoteOpened) {
      out.quoteItem = await dlg.locator('.quote-item textarea').first().inputValue();
      out.quoteAmount = await dlg.locator('.quote-item input').first().inputValue();
      out.quoteNotice = (await dlg.locator('p').first().textContent()).trim();
      const dOverflow = await page.evaluate(() => { const d = document.querySelector('#spt-quote-preview'); return d.scrollWidth - d.clientWidth; });
      if (dOverflow > 1) out.errors.push(`quote dialog overflow ${dOverflow}px`);
    } else out.errors.push('quote editor did not open');
  } else out.errors.push('quote CTA missing or hidden');
  // Every checklist and toolkit link: one click, one analytics event, correct destination.
  if (out.quoteOpened) await page.locator('#spt-quote-preview button', { hasText: 'Close' }).click();
  // gtag() calls as queued for Google: window.dataLayer on production (where the Google tag itself is blocked
  // by this audit, so nothing is sent), window.sptAnalyticsSuppressed everywhere else.
  await page.evaluate(() => { window.__sent = () => [...(window.sptAnalyticsSuppressed || []), ...[...(window.dataLayer || [])].filter(a => a && typeof a === 'object' && 'length' in a && !Array.isArray(a)).map(a => Array.from(a))]; });
  out.linkClicks = await page.evaluate(() => {
    const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[hidden]'); };
    const links = [...document.querySelectorAll('a[data-free-cta], a[data-paid-cta]')].filter(vis);
    const out = [];
    for (const a of links) {
      const stop = e => e.preventDefault(); a.addEventListener('click', stop);
      const n = window.__sent().length;
      a.click(); a.removeEventListener('click', stop);
      const sent = window.__sent().slice(n).filter(x => x[0] === 'event');
      out.push({ kind: a.dataset.freeCta ? 'free' : 'paid', placement: a.dataset.freeCta || a.dataset.paidCta, href: a.href, events: sent.map(x => x[1] + '@' + (x[2]?.placement || '')) });
    }
    return out;
  });
  for (const c of out.linkClicks) {
    const want = (c.kind === 'free' ? 'free_checklist_clicked@' : 'paid_cta_clicked@') + c.placement;
    if (c.events.length !== 1 || c.events[0] !== want) out.errors.push(`${c.kind} link @${c.placement} sent [${c.events.join(',')}], expected ${want}`);
    if (c.kind === 'paid' && !/payhip\.com\/buy\?link=/.test(c.href)) out.errors.push(`paid link @${c.placement} not upgraded to direct checkout: ${c.href}`);
  }
  out.gtagEvents = await page.evaluate(() => window.__sent().filter(a => a[0] === 'event').map(a => a[1]));
  for (const once of ['calculator_viewed', 'calculator_completed']) if (out.gtagEvents.filter(e => e === once).length > 1) out.errors.push(once + ' sent more than once');
  out.events = await page.evaluate(() => window.__events.map(e => e.event + (e.placement ? '@' + e.placement : '')));
  const counts = out.events.reduce((m, e) => (m[e] = (m[e] || 0) + 1, m), {});
  out.duplicateEvents = Object.entries(counts).filter(([e, n]) => n > 1 && /viewed|opened/.test(e)).map(([e]) => e);
  for (const need of quoteHidden ? ['calculator_viewed'] : ['calculator_viewed', 'quote_builder_opened']) if (!out.events.some(e => e.startsWith(need))) out.warnings.push('missing event ' + need);
  if (out.duplicateEvents.length) out.errors.push('duplicate events: ' + out.duplicateEvents.join(','));
  await ctx.close();
  return out;
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const results = [];
for (const niche of pages) for (const vp of Object.keys(VIEWPORTS)) {
  try { results.push(await auditPage(browser, niche, vp)); }
  catch (e) { results.push({ niche: niche.id, viewport: vp, errors: ['audit crashed: ' + e.message.split('\n')[0]], warnings: [] }); }
}
await browser.close();

// Internal links, once per unique path.
const internal = [...new Set(results.flatMap(r => r.internal || []))];
const broken = [];
for (const href of internal) { const u = new URL(href, base); if (u.pathname.startsWith('/api/')) continue; const r = await fetch(u); if (r.status >= 400) broken.push(`${href} → ${r.status}`); }

let failed = 0;
for (const r of results) {
  const bad = r.errors.length;
  if (bad) failed++;
  console.log(`${bad ? 'FAIL' : 'ok  '} ${r.niche.padEnd(22)} ${r.viewport.padEnd(8)} quote:${r.quoteOpened ? 'opened' : 'no'} item:"${(r.quoteItem || '').slice(0, 40)}" ${r.quoteAmount || ''} paid:${(r.paidLinks || []).length} free:${(r.freeLinks || []).length} ${bad ? '\n       ✗ ' + r.errors.join('\n       ✗ ') : ''}${r.warnings.length ? '\n       ! ' + r.warnings.join('\n       ! ') : ''}`);
}
console.log(`\n${results.length - failed}/${results.length} page-viewport checks passed; ${broken.length} broken internal links${broken.length ? ': ' + broken.join(', ') : ''}`);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ results, broken }, null, 1));
process.exit(failed || broken.length ? 1 : 0);

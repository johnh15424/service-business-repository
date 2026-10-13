// End-to-end €4 quotation journey in a real browser against the local preview in mock checkout mode:
//   QUOTE_DEV_CHECKOUT=mock node scripts/quote-dev-server.mjs
//   node tests/browser/quote-flow.mjs [baseUrl] [nicheId,...]
// The real Worker API, D1 schema, PDF renderer, capture verification and download page run unchanged;
// only PayPal is replaced by an in-process fake. No request leaves the machine and nothing is charged.
import { chromium, devices } from 'playwright';
import assert from 'node:assert/strict';
import { nicheById } from '../../public/assets/niche-registry.js';

const base = (process.argv.find(a => /^https?:/.test(a)) || 'http://127.0.0.1:8081').replace(/\/$/, '');
const ids = (process.argv.slice(2).find(a => /^[a-z_,]+$/.test(a)) || 'house_cleaning,gutter_cleaning,pressure_washing').split(',');
const browser = await chromium.launch();
const results = [];

for (const id of ids) {
  const niche = nicheById(id);
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const requests = [];
  page.on('request', r => { if (r.url().includes('/api/quotes')) requests.push(r.method() + ' ' + new URL(r.url()).pathname.replace(/[0-9a-f-]{36}/, ':id') + (r.postData() ? ' ' + r.postData().slice(0, 120) : '')); });
  await page.route(/googletagmanager|google-analytics|paypal\.com|paypalobjects|payhip/, r => r.abort('blockedbyclient'));
  // The fake provider's approval page: behave like a buyer who approves, returning to the shop.
  await page.route(/^https:\/\/www\.sandbox\.paypal\.com\/checkoutnow/, r => {
    const back = new URL(r.request().url()).searchParams.get('mock_return');
    return r.fulfill({ status: 302, headers: { location: back + '?PayerID=MOCKPAYER' } });
  });
  await page.route(u => u.origin === base && /\/$/.test(u.pathname), async r => {
    const res = await r.fetch();
    await r.fulfill({ response: res, body: (await res.text()).replace('<head>', '<head><script src="/assets/site-analytics.js"></script>') });
  });
  const step = {};
  try {
    await page.goto(base + niche.calculatorPath, { waitUntil: 'networkidle' });
    await page.locator('#spt-consent button', { hasText: 'Reject' }).click();
    // Visitor enters their own figure, so the quote should not be flagged as example pricing.
    const hours = page.locator('#workHours, #hours').first();
    await hours.fill(String(Number(await hours.inputValue()) + 1));
    await page.waitForTimeout(200);
    const shownPrice = (await page.locator('[data-result="preTax"]').first().textContent()).replace(/[^0-9.]/g, '');
    await page.locator('#spt-offer-hero [data-quote-open]').click();
    const dlg = page.locator('#spt-quote-preview');
    await dlg.waitFor({ state: 'visible' });
    step.exampleNoteHidden = await dlg.locator('.quote-example-note').isHidden();
    step.item = await dlg.locator('.quote-item textarea').first().inputValue();
    step.amount = await dlg.locator('.quote-item input').first().inputValue();
    assert.equal(Number(step.amount).toFixed(2), Number(shownPrice).toFixed(2), 'quote line carries the calculated pre-tax price');
    assert.match(step.item, new RegExp(niche.name.split(' ')[0]), 'quote line names the service');
    await dlg.getByLabel('Business name').fill('Test Trader Ltd');
    await dlg.getByLabel('Customer name').fill('A Customer');
    await dlg.getByRole('button', { name: 'Preview my quote (free)' }).click();
    await dlg.locator('.quote-paper h2').waitFor();
    await page.waitForFunction(() => /Preview ready/.test(document.querySelector('#spt-quote-preview [role=status]')?.textContent || ''), null, { timeout: 20000 });
    step.watermark = await dlg.locator('.quote-watermark').textContent();
    step.total = (await dlg.locator('.quote-total').first().textContent()).trim();
    assert.equal(step.total, 'Total: 4.00 EUR, one-time payment');
    const payButton = dlg.getByRole('button', { name: /Pay €4(\.00)? with PayPal/ }).first();
    step.payLabel = (await payButton.textContent()).trim();
    await Promise.all([page.waitForURL(/\/quote-download\//), payButton.click()]);
    await page.waitForFunction(() => /Payment successful/.test(document.getElementById('quote-heading')?.textContent || ''), null, { timeout: 30000 });
    await page.waitForFunction(() => document.getElementById('quote-download')?.href?.startsWith('blob:'), null, { timeout: 20000 });
    const sent = () => page.evaluate(() => (window.sptAnalyticsSuppressed || []).filter(a => a[0] === 'event').map(a => ({ name: a[1], value: a[2]?.value, currency: a[2]?.currency, tx: a[2]?.transaction_id })));
    step.analytics = await sent();
    const purchases = step.analytics.filter(e => e.name === 'paid_purchase');
    assert.equal(purchases.length, 1, 'exactly one paid_purchase');
    assert.equal(purchases[0].value, 4); assert.equal(purchases[0].currency, 'EUR');
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#quote-download').click()]);
    const path = await download.path(); const { readFileSync } = await import('node:fs');
    step.pdfBytes = readFileSync(path).length;
    assert.ok(readFileSync(path).subarray(0, 5).toString() === '%PDF-', 'a real PDF is delivered');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => /Payment successful/.test(document.getElementById('quote-heading')?.textContent || ''), null, { timeout: 30000 });
    step.purchasesAfterReload = (await sent()).filter(e => e.name === 'paid_purchase').length;
    assert.equal(step.purchasesAfterReload, 0, 'a reload never reports the sale again');
    step.checkoutRequests = requests.filter(r => r.includes('/checkout')).map(r => r.replace(/^POST \S+ /, ''));
    assert.ok(step.checkoutRequests.every(b => /"currency":"EUR"/.test(b)), 'checkout asks for EUR only');
    results.push({ id, ok: true, ...step });
  } catch (e) {
    results.push({ id, ok: false, error: e.message.split('\n')[0], ...step });
  }
  await ctx.close();
}
await browser.close();
for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.id}: ${r.ok ? `item "${r.item}" ${r.amount}; ${r.payLabel}; ${r.total}; PDF ${r.pdfBytes} bytes; events ${[...new Set(r.analytics.map(e => e.name))].join(',')}` : r.error}`);
process.exit(results.every(r => r.ok) ? 0 : 1);

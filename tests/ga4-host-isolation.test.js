import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import worker from '../src/worker.js';

const PRODUCTION = ['servicepricingtools.com', 'www.servicepricingtools.com'];
const NON_PRODUCTION = [
  'service-business-repository.irishambience.workers.dev',
  'feature-quote-generator-preview-service-business-repository.irishambience.workers.dev',
  '3b9a4f2f-service-business-repository.irishambience.workers.dev',
  'service-business-repository-sandbox.irishambience.workers.dev',
  'localhost',
  '127.0.0.1',
  'servicepricingtools.com.evil.example',
  'notservicepricingtools.com',
  'preview.servicepricingtools.com'
];

async function injectedHtml(host, contentType = 'text/html; charset=utf-8') {
  let html = null;
  const previous = globalThis.HTMLRewriter;
  globalThis.HTMLRewriter = class {
    on(_name, handler) { handler.element({ prepend(value) { html = value; } }); return this; }
    transform(response) { return response; }
  };
  try {
    await worker.fetch(new Request(`https://${host}/house-cleaning-price-calculator/`), {
      ASSETS: { fetch: async () => new Response('<head></head>', { headers: { 'content-type': contentType } }) }
    });
  } finally {
    if (previous === undefined) delete globalThis.HTMLRewriter; else globalThis.HTMLRewriter = previous;
  }
  return html;
}

function runAnalytics(hostname) {
  const listeners = new Map(), dataLayer = [];
  const win = { location: { search: '', hostname }, dataLayer, addEventListener: (n, fn) => listeners.set(n, fn) };
  const context = vm.createContext({ URLSearchParams, window: win, dataLayer, document: { addEventListener() {} }, Date, encodeURIComponent });
  vm.runInContext(readFileSync('public/assets/site-analytics.js', 'utf8'), context);
  return { context, win, dataLayer, listeners };
}

for (const host of PRODUCTION) {
  test(`Worker injects GA4 on production host ${host}`, async () => {
    const html = await injectedHtml(host);
    assert.ok(html?.includes('src="/assets/site-analytics.js"'));
    assert.ok(html.includes('googletagmanager.com/gtag/js?id=G-J3BBT6YZRB'));
  });
  test(`analytics measures calculator_completed and paid_cta_clicked on ${host}`, () => {
    const { win, dataLayer, listeners } = runAnalytics(host);
    assert.equal(win['ga-disable-G-J3BBT6YZRB'], undefined);
    assert.deepEqual([dataLayer[1][0], dataLayer[1][1]], ['config', 'G-J3BBT6YZRB']);
    assert.equal([...dataLayer[1][2].linker.domains].join(','), 'servicepricingtools.com,payhip.com');
    listeners.get('calculator:conversion')({ detail: { event: 'calculator_completed', calculator: 'house_cleaning' } });
    listeners.get('commercial:conversion')({ detail: { event: 'paid_cta_clicked', niche: 'house_cleaning', placement: 'result' } });
    assert.deepEqual(dataLayer.slice(2).map(e => [e[0], e[1]]), [['event', 'calculator_completed'], ['event', 'paid_cta_clicked']]);
    assert.equal(dataLayer[3][2].placement, 'result');
  });
}

for (const host of NON_PRODUCTION) {
  test(`Worker does not load the Google tag on ${host}`, async () => {
    const html = await injectedHtml(host);
    assert.ok(!html.includes('googletagmanager'));
    assert.equal(html, '<script src="/assets/site-analytics.js"></script>');
  });
  test(`analytics sends nothing and disables GA4 on ${host}, but keeps direct Payhip checkout`, () => {
    const { context, win, dataLayer, listeners } = runAnalytics(host);
    assert.equal(win['ga-disable-G-J3BBT6YZRB'], true);
    listeners.get('calculator:conversion')({ detail: { event: 'calculator_completed', calculator: 'house_cleaning' } });
    listeners.get('commercial:conversion')({ detail: { event: 'paid_cta_clicked', niche: 'house_cleaning' } });
    assert.equal(dataLayer.length, 0);
    assert.equal(context.directPayhipCheckout('https://payhip.com/b/7pXUm'), 'https://payhip.com/buy?link=7pXUm');
  });
}

test('non-HTML responses on production are never rewritten', async () => {
  assert.equal(await injectedHtml('servicepricingtools.com', 'text/css'), null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import worker, { headScripts } from '../src/worker.js';

const script = readFileSync('public/assets/site-analytics.js', 'utf8');
function run(hostname) {
  const dataLayer = [], listeners = new Map();
  const window = { location: { hostname, search: '', pathname: '/', origin: 'https://' + hostname }, dataLayer,
    addEventListener: (n, f) => listeners.set(n, f), localStorage: { getItem: () => null, setItem() {} } };
  vm.runInContext(script, vm.createContext({ URLSearchParams, Date, encodeURIComponent, JSON, dataLayer, window, document: { addEventListener() {} } }));
  return { dataLayer, window, listeners };
}

async function injected(url) {
  let html;
  const previous = globalThis.HTMLRewriter;
  globalThis.HTMLRewriter = class { on(_n, h) { h.element({ prepend(v) { html = v; } }); return this; } transform(r) { return r; } };
  try { await worker.fetch(new Request(url), { ASSETS: { fetch: async () => new Response('', { headers: { 'content-type': 'text/html' } }) } }); }
  finally { if (previous === undefined) delete globalThis.HTMLRewriter; else globalThis.HTMLRewriter = previous; }
  return html;
}

test('the Google tag is injected only on the public hosts', async () => {
  for (const host of ['servicepricingtools.com', 'www.servicepricingtools.com']) {
    const html = await injected(`https://${host}/house-cleaning-price-calculator/`);
    assert.match(html, /googletagmanager\.com\/gtag\/js\?id=G-J3BBT6YZRB/, host);
    assert.match(html, /\/assets\/site-analytics\.js/, host);
  }
  for (const host of ['service-business-repository.irishambience.workers.dev', 'feature-x-service-business-repository.irishambience.workers.dev', 'service-business-repository-sandbox.irishambience.workers.dev', 'localhost', 'servicepricingtools.com.evil.example']) {
    const html = headScripts(host);
    assert.doesNotMatch(html, /googletagmanager/, host);
    assert.match(html, /\/assets\/site-analytics\.js/, host + ' keeps consent handling and direct Payhip links');
  }
});

test('previews never queue production GA4 commands, even if the tag is present', () => {
  for (const host of ['abc123-service-business-repository.irishambience.workers.dev', '127.0.0.1', 'localhost']) {
    const { dataLayer, window, listeners } = run(host);
    listeners.get('calculator:conversion')({ detail: { event: 'calculator_viewed', calculator: 'house_cleaning' } });
    assert.equal(dataLayer.length, 0, host);
    assert.equal(window['ga-disable-G-J3BBT6YZRB'], true, host);
    assert.ok(window.sptAnalyticsSuppressed.some(a => a[0] === 'event' && a[1] === 'calculator_viewed'), host + ' records what would have been sent');
  }
  const prod = run('servicepricingtools.com');
  assert.ok(prod.dataLayer.some(a => a[0] === 'config' && a[1] === 'G-J3BBT6YZRB'));
  assert.equal(prod.window['ga-disable-G-J3BBT6YZRB'], undefined);
});

test('page milestones are reported once per page; clicks and placements pass through', () => {
  const { dataLayer, listeners } = run('servicepricingtools.com');
  const events = () => dataLayer.filter(a => a[0] === 'event').map(a => a[1] + (a[2].placement ? '@' + a[2].placement : ''));
  const send = (channel, detail) => listeners.get(channel)({ detail });
  for (let i = 0; i < 3; i++) send('calculator:conversion', { event: 'calculator_completed', calculator: 'house_cleaning' });
  send('calculator:conversion', { event: 'calculator_viewed', calculator: 'house_cleaning' });
  send('calculator:conversion', { event: 'calculator_viewed', calculator: 'house_cleaning' });
  send('calculator:conversion', { event: 'free_checklist_clicked', calculator: 'house_cleaning', placement: 'hero' });
  send('calculator:conversion', { event: 'free_checklist_clicked', calculator: 'house_cleaning', placement: 'hero' });
  send('quote:conversion', { event: 'quote_builder_opened', niche: 'house_cleaning', placement: 'hero' });
  send('quote:conversion', { event: 'paid_purchase', niche: 'house_cleaning', value: 4 });
  assert.deepEqual(events(), ['calculator_completed', 'calculator_viewed', 'free_checklist_clicked@hero', 'free_checklist_clicked@hero', 'quote_builder_opened@hero']);
});

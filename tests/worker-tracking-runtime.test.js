import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import worker from '../src/worker.js';

test('injected tracking script runs and preserves checkout and event forwarding', async () => {
  let html;
  const previous = globalThis.HTMLRewriter;
  globalThis.HTMLRewriter = class {
    on(name, handler) {
      assert.equal(name, 'head');
      handler.element({ prepend(value) { html = value; } });
      return this;
    }
    transform(response) { return response; }
  };
  try {
    await worker.fetch({}, {
      ASSETS: { fetch: async () => new Response('', { headers: { 'content-type': 'text/html' } }) }
    });
  } finally {
    if (previous === undefined) delete globalThis.HTMLRewriter;
    else globalThis.HTMLRewriter = previous;
  }
  assert.ok(html.includes('src="/assets/site-analytics.js"'));
  const inline = readFileSync('public/assets/site-analytics.js','utf8');
  const listeners = new Map();
  const dataLayer = [];
  const context = vm.createContext({
    URLSearchParams,
    window: { location: {search:''}, dataLayer, addEventListener: (name, fn) => listeners.set(name, fn) },
    dataLayer,
    document: { addEventListener() {} },
    Date,
    encodeURIComponent
  });
  vm.runInContext(inline, context);
  assert.equal(dataLayer[1][0], 'config');
  assert.equal(dataLayer[1][1], 'G-J3BBT6YZRB');
  assert.equal(context.directPayhipCheckout('https://payhip.com/b/7pXUm'), 'https://payhip.com/buy?link=7pXUm');
  assert.equal(context.directPayhipCheckout('https://example.com/'), 'https://example.com/');
  listeners.get('calculator:conversion')({ detail: { event: 'calculator_completed', calculator: 'dog_grooming' } });
  assert.equal(dataLayer[2][0], 'event');
  assert.equal(dataLayer[2][1], 'calculator_completed');
  assert.equal(dataLayer[2][2].calculator, 'dog_grooming');
  for (const event of ['purchase','paid_purchase','refund']) listeners.get('commercial:conversion')({detail:{event}});
  assert.equal(dataLayer.length,3,'browser click hooks must never emit purchase events');
});

test('CSP permits analytics without permitting arbitrary inline scripts',()=>{
 const headers=readFileSync('public/_headers','utf8');
 assert.match(headers,/script-src 'self' https:\/\/www.googletagmanager.com/);
 assert.match(headers,/connect-src[^;]+https:\/\/region1.google-analytics.com/);
 assert.ok(!headers.includes("'unsafe-inline'"));
});

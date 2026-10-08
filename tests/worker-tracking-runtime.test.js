import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
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
  const inline = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const listeners = new Map();
  const dataLayer = [];
  const context = vm.createContext({
    window: { dataLayer, addEventListener: (name, fn) => listeners.set(name, fn) },
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
});

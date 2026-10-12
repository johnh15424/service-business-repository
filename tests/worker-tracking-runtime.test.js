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
    await worker.fetch(new Request('https://servicepricingtools.com/'), {
      ASSETS: { fetch: async () => new Response('', { headers: { 'content-type': 'text/html' } }) }
    });
  } finally {
    if (previous === undefined) delete globalThis.HTMLRewriter;
    else globalThis.HTMLRewriter = previous;
  }
  assert.ok(html.includes('src="/assets/site-analytics.js"'));
  const inline = readFileSync('public/assets/site-analytics.js','utf8');
  const listeners = new Map();
  const run = ({search='', pathname='/', stored=null, on=()=>{}}={}) => {
    const dataLayer = [];
    const store = new Map(stored ? [['spt_consent_v1', stored]] : []);
    const context = vm.createContext({
      URLSearchParams, dataLayer, Date, encodeURIComponent, JSON,
      window: { location: {search, pathname, origin:'https://servicepricingtools.com'}, dataLayer, addEventListener: on,
        localStorage: { getItem: k => store.get(k) ?? null, setItem: (k,v) => store.set(k,v) } },
      document: { addEventListener() {} }
    });
    vm.runInContext(inline, context);
    return {dataLayer, context, store, cmd: name => dataLayer.filter(a => a[0] === name)};
  };
  const {dataLayer, context, cmd} = run({on: (name, fn) => listeners.set(name, fn)});
  // Consent defaults to denied before anything else, and silence is never treated as consent.
  assert.equal(JSON.stringify([...dataLayer[0]]), JSON.stringify(['consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'}]));
  assert.equal(cmd('consent').length, 1, 'no stored choice: no consent update');
  const config = cmd('config')[0];
  assert.equal(config[1], 'G-J3BBT6YZRB');
  assert.ok(!('debug_mode' in config[2]), 'normal visits must not carry debug_mode');
  assert.ok(!('page_location' in config[2]));
  assert.equal(run({search:'?spt_debug=1'}).cmd('config')[0][2].debug_mode, true);
  // A stored Accept grants all four signals before the tag is configured; a stored Reject keeps the defaults.
  const accepted = run({stored: JSON.stringify({choice:'granted'})});
  assert.equal(JSON.stringify([...accepted.cmd('consent')[1]]), JSON.stringify(['consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'}]));
  assert.ok(accepted.dataLayer.findIndex(a => a[1] === 'update') < accepted.dataLayer.findIndex(a => a[0] === 'config'));
  assert.equal(run({stored: JSON.stringify({choice:'denied'})}).cmd('consent').length, 1);
  assert.equal(run({stored: 'not json'}).cmd('consent').length, 1, 'corrupt storage is treated as no choice');
  // Changing preferences later persists and updates consent.
  const later = run({stored: JSON.stringify({choice:'granted'})});
  later.context.window.sptConsent.set('denied');
  assert.equal(JSON.parse(later.store.get('spt_consent_v1')).choice, 'denied');
  assert.equal(later.cmd('consent').at(-1)[2].analytics_storage, 'denied');
  assert.equal(later.context.window.sptConsent.get(), 'denied');
  // The private download page reports only its bare path, never the token in the fragment.
  const download = run({pathname:'/quote-download/'}).cmd('config')[0][2];
  assert.equal(download.page_location, 'https://servicepricingtools.com/quote-download/');
  assert.equal(download.page_referrer, '');
  const baseline = dataLayer.length;
  assert.equal(context.directPayhipCheckout('https://payhip.com/b/7pXUm'), 'https://payhip.com/buy?link=7pXUm');
  assert.equal(context.directPayhipCheckout('https://example.com/'), 'https://example.com/');
  listeners.get('calculator:conversion')({ detail: { event: 'calculator_completed', calculator: 'dog_grooming' } });
  assert.equal(dataLayer[baseline][0], 'event');
  assert.equal(dataLayer[baseline][1], 'calculator_completed');
  assert.equal(dataLayer[baseline][2].calculator, 'dog_grooming');
  for (const event of ['purchase','paid_purchase','refund']) listeners.get('commercial:conversion')({detail:{event}});
  assert.equal(dataLayer.length,baseline+1,'browser click hooks must never emit purchase events');
});

test('CSP permits analytics without permitting arbitrary inline scripts',()=>{
 const headers=readFileSync('public/_headers','utf8');
 assert.match(headers,/script-src 'self' https:\/\/www.googletagmanager.com/);
 assert.match(headers,/connect-src[^;]+https:\/\/region1.google-analytics.com/);
 assert.ok(!headers.includes("'unsafe-inline'"));
});

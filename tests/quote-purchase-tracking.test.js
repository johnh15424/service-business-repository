// Runtime tests for the paid download page's conversion signals.
//
// These drive the real public/assets/quote-download.js in a VM against a stubbed quote API, so they
// assert what the browser would actually send to GA4 rather than re-describing the source. No jsdom:
// the page touches a small, fixed set of DOM methods, so a hand-rolled stub keeps the suite
// dependency-free, in the same style as worker-tracking-runtime.test.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const SOURCE = readFileSync('public/assets/quote-download.js', 'utf8');
const ID = '0a1b2c3d-4e5f-6071-8293-a4b5c6d7e8f9';
const TOKEN = 'a'.repeat(64);
const HASH = `#${ID}.${TOKEN}`;

/** A storage stub. `blocked` throws on every access, like Safari private mode or blocked site data. */
function storage({ blocked = false, map = new Map() } = {}) {
  const guard = () => { if (blocked) throw new Error('storage blocked'); };
  return {
    map,
    getItem(k) { guard(); return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { guard(); map.set(k, String(v)); },
    removeItem(k) { guard(); map.delete(k); }
  };
}

function element() {
  return {
    hidden: false, disabled: false, textContent: '', href: '', download: '', onclick: null,
    dataset: {}, attributes: {},
    setAttribute(k, v) { this.attributes[k] = v; },
    removeAttribute(k) { delete this.attributes[k]; },
    replaceChildren() {},
    focus() {}, scrollIntoView() {}
  };
}

/**
 * Load the download page against one quote API state.
 *
 * @param {object} options
 * @param {object} options.statusBody    JSON returned by GET /api/quotes/:id/status
 * @param {object} [options.local]       localStorage stub, shared between runs to model a refresh
 * @param {object} [options.session]     sessionStorage stub
 * @param {string} [options.hash]        location.hash, defaults to a valid private link
 * @returns {Promise<{events: Array, elements: Map, requests: string[]}>}
 */
async function load({ statusBody, local = storage(), session = storage(), hash = HASH } = {}) {
  const events = [], requests = [], elements = new Map();
  const get = id => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };

  const fetchStub = async (url, init = {}) => {
    requests.push(`${init.method || 'GET'} ${url}`);
    if (url === '/api/quotes/config') return { ok: true, json: async () => ({}) };
    if (url.endsWith('/status')) return { ok: true, json: async () => statusBody };
    if (url.endsWith('/capture')) return { ok: true, json: async () => ({ status: statusBody.status }) };
    if (url.endsWith('/download')) return { ok: true, blob: async () => ({ size: 50000 }) };
    if (url.endsWith('/delivered')) return { ok: true, json: async () => ({ recorded: true }) };
    return { ok: false, json: async () => ({ error: 'Not found' }) };
  };

  const context = vm.createContext({
    Promise, JSON, Object, Number, String, Array, Boolean, Error, Math, Date, RegExp,
    console, setTimeout: () => 0, clearTimeout: () => {}, fetch: fetchStub,
    localStorage: local, sessionStorage: session,
    URL: { createObjectURL: () => 'blob:stub', revokeObjectURL: () => {} },
    history: { replaceState: () => {} },
    location: { hash, search: '', pathname: '/quote-download/', origin: 'https://servicepricingtools.com' },
    document: { getElementById: get, createElement: () => element() },
    window: { gtag: (kind, name, params) => events.push({ kind, name, params }) }
  });
  context.window.location = context.location;
  context.window.localStorage = local;

  vm.runInContext(SOURCE, context);
  // Let the status -> capture -> showPaid -> preparePdf promise chain settle.
  for (let i = 0; i < 40; i++) await Promise.resolve();
  return { events, elements, requests, local, session };
}

const named = (events, name) => events.filter(e => e.name === name);
const PAID = { status: 'paid', transactionId: `quote_${ID}`, priceMinor: 400, niche: 'dog_grooming', expiresAt: 0, checkoutUrl: null, email: null };

test('a verified EUR 4 payment sends both the GA4 purchase and the Ads paid_purchase signal', async () => {
  const { events } = await load({ statusBody: PAID });

  // The Google Ads primary conversion action is the GA4 event `paid_purchase`. Before this change
  // nothing on the site emitted it, so the primary action could never record a conversion.
  const purchase = named(events, 'purchase');
  const paid = named(events, 'paid_purchase');
  assert.equal(purchase.length, 1, 'exactly one purchase event');
  assert.equal(paid.length, 1, 'exactly one paid_purchase event');

  for (const [label, event] of [['purchase', purchase[0]], ['paid_purchase', paid[0]]]) {
    assert.equal(event.kind, 'event', `${label} is a gtag event`);
    assert.equal(event.params.value, 4, `${label} carries the real amount paid`);
    assert.equal(event.params.currency, 'EUR', `${label} carries EUR`);
    assert.equal(event.params.transaction_id, `quote_${ID}`, `${label} carries the verified transaction id`);
    // JSON round-trip: the params object is built inside the VM, so it has that realm's prototype.
    assert.deepEqual(JSON.parse(JSON.stringify(event.params.items)), [{ item_id: 'professional_quote', item_name: 'Professional PDF quotation', price: 4, quantity: 1 }], `${label} carries the item`);
  }
  // A shared transaction_id is what lets GA4 and Ads collapse the pair instead of double-counting.
  assert.equal(purchase[0].params.transaction_id, paid[0].params.transaction_id);
});

test('the purchase is reported in the currency actually charged, not the page default', async () => {
  // GA4 and Ads revenue must match the PayPal settlement. The currency comes from the quote row the
  // server verified the capture against, so a US buyer's sale is never filed as euro.
  for (const [currency, priceMinor, value] of [['USD', 499, 4.99], ['GBP', 349, 3.49], ['EUR', 400, 4]]) {
    const { events } = await load({ statusBody: { ...PAID, currency, priceMinor } });
    for (const name of ['purchase', 'paid_purchase', 'quote_payment_verified']) {
      const [event] = named(events, name);
      assert.equal(event.params.currency, currency, `${name} currency`);
      assert.equal(event.params.value, value, `${name} value`);
    }
    assert.equal(JSON.parse(JSON.stringify(named(events, 'purchase')[0].params.items))[0].price, value, 'the item price matches');
  }
});

test('a missing or malformed currency falls back to EUR rather than reporting nothing', async () => {
  // Orders created before the currency column existed report no currency; they were all euro.
  for (const currency of [undefined, null, '', 'eur', 'EUROS', 42]) {
    const { events } = await load({ statusBody: { ...PAID, currency } });
    assert.equal(named(events, 'purchase')[0].params.currency, 'EUR', String(currency));
  }
});

test('the recorded price is used, so historical EUR 3 orders are not reported as EUR 4', async () => {
  const { events } = await load({ statusBody: { ...PAID, priceMinor: 300 } });
  assert.equal(named(events, 'purchase')[0].params.value, 3);
  assert.equal(named(events, 'paid_purchase')[0].params.value, 3);
});

test('an unpaid, cancelled, failed or refunded quote sends no purchase signal', async () => {
  for (const statusBody of [
    { ...PAID, status: 'checkout', transactionId: null, checkoutUrl: 'https://www.paypal.com/checkoutnow?token=x' },
    { ...PAID, status: 'draft', transactionId: null },
    { ...PAID, status: 'refunded', transactionId: null },
    { ...PAID, status: 'reversed', transactionId: null }
  ]) {
    const { events } = await load({ statusBody });
    assert.equal(named(events, 'purchase').length, 0, `${statusBody.status} must not send purchase`);
    assert.equal(named(events, 'paid_purchase').length, 0, `${statusBody.status} must not send paid_purchase`);
  }
});

test('a zero-value or free transaction sends no purchase signal', async () => {
  for (const priceMinor of [0, null, undefined, -100]) {
    const { events } = await load({ statusBody: { ...PAID, priceMinor } });
    assert.equal(named(events, 'purchase').length, 0, `priceMinor ${priceMinor} must not send purchase`);
    assert.equal(named(events, 'paid_purchase').length, 0, `priceMinor ${priceMinor} must not send paid_purchase`);
  }
});

test('a paid quote with no verified transaction id sends no purchase signal', async () => {
  const { events } = await load({ statusBody: { ...PAID, transactionId: null } });
  assert.equal(named(events, 'purchase').length, 0);
  assert.equal(named(events, 'paid_purchase').length, 0);
});

test('refreshing or reopening the download page never repeats the sale', async () => {
  const local = storage(), session = storage();
  const first = await load({ statusBody: PAID, local, session });
  assert.equal(named(first.events, 'purchase').length, 1);
  assert.equal(named(first.events, 'paid_purchase').length, 1);

  // Each load() is a fresh page load sharing this device's storage: a refresh, a revisit, a retry.
  for (const attempt of [1, 2, 3]) {
    const again = await load({ statusBody: PAID, local, session });
    assert.equal(named(again.events, 'purchase').length, 0, `reload ${attempt} must not repeat purchase`);
    assert.equal(named(again.events, 'paid_purchase').length, 0, `reload ${attempt} must not repeat paid_purchase`);
  }
});

test('a refresh cannot repeat the sale when localStorage is blocked', async () => {
  // Private browsing and blocked site data make localStorage throw. A guard that only reads
  // localStorage fails open there and re-sends the sale on every refresh; sessionStorage catches it.
  const local = storage({ blocked: true }), session = storage();
  const first = await load({ statusBody: PAID, local, session });
  assert.equal(named(first.events, 'paid_purchase').length, 1, 'the sale is still counted once');

  const second = await load({ statusBody: PAID, local, session });
  assert.equal(named(second.events, 'purchase').length, 0, 'no repeat purchase');
  assert.equal(named(second.events, 'paid_purchase').length, 0, 'no repeat paid_purchase');
});

test('the sale is still counted once when every store is blocked', async () => {
  const { events } = await load({ statusBody: PAID, local: storage({ blocked: true }), session: storage({ blocked: true }) });
  assert.equal(named(events, 'purchase').length, 1, 'blocked storage must not silence the conversion');
  assert.equal(named(events, 'paid_purchase').length, 1);
});

test('no private link token, customer data or payment detail reaches analytics', async () => {
  const { events } = await load({
    statusBody: { ...PAID, email: { address: 'buyer@example.com', status: 'sent' }, checkoutUrl: 'https://www.paypal.com/checkoutnow?token=SECRET' }
  });
  assert.ok(events.length > 0, 'the page did send events');
  const payload = JSON.stringify(events);
  // The quote id is deliberately present as `quote_<id>`: it IS the transaction id, and it is what
  // reconciles a GA4 sale against a PayPal capture. The bearer token in the fragment is the secret.
  for (const secret of [TOKEN, 'buyer@example.com', 'SECRET', 'paypal', '#']) {
    assert.ok(!payload.includes(secret), `analytics payload must not contain ${secret.slice(0, 24)}`);
  }
  assert.ok(payload.includes(`quote_${ID}`), 'the transaction id is the reconcilable quote reference');
  // Only the bare page path is reported, never the fragment that unlocks the paid PDF.
  for (const event of events) {
    assert.equal(event.params.page_location, 'https://servicepricingtools.com/quote-download/');
    assert.equal(event.params.page_referrer, '');
  }
});

test('an incomplete private link sends nothing at all', async () => {
  const { events, requests } = await load({ statusBody: PAID, hash: '#not-a-valid-link' });
  assert.equal(events.length, 0, 'no events without a valid link');
  assert.ok(!requests.some(r => r.includes('/status')), 'no quote is looked up');
});

test('the purchase signal follows a server-verified status, not a client assumption', async () => {
  const { requests } = await load({ statusBody: PAID });
  assert.ok(requests.some(r => r === `GET /api/quotes/${ID}/status`), 'status is fetched from the server');
});

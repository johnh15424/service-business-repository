import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderDirectory } from '../factory/directory.mjs';
import { liveNiches, nicheRegistry } from '../public/assets/niche-registry.js';

// Renders in memory and compares against the committed page. Never writes to public/.
const committed = () => readFileSync(join('public', 'calculators', 'index.html'), 'utf8');

test('committed calculator directory matches freshly rendered output', () => {
  assert.equal(
    renderDirectory(),
    committed(),
    'public/calculators/index.html differs from generator output. Run "npm run generate" and commit the result.'
  );
});

test('every live niche has a directoryDescription', () => {
  for (const niche of liveNiches()) {
    assert.equal(typeof niche.directoryDescription, 'string', `${niche.id}: missing directoryDescription`);
    assert.ok(niche.directoryDescription.length > 20, `${niche.id}: directoryDescription too short`);
  }
});

test('directory renders one static crawlable card per live niche', () => {
  const html = committed();
  const live = liveNiches();
  const cards = html.match(/<article class="directory-card"/g) || [];
  assert.equal(cards.length, live.length, 'card count must match the live niche count');
  for (const niche of live) {
    assert.ok(html.includes(`href="${niche.calculatorPath}"`), `${niche.id}: missing calculator link`);
    assert.ok(html.includes(`data-niche="${niche.id}"`), `${niche.id}: missing card`);
    if (niche.proUrl) {
      assert.ok(html.includes(`href="${niche.proUrl}"`), `${niche.id}: missing Pro Toolkit link`);
    }
  }
  assert.match(html, /Open free calculator/, 'missing primary CTA');
  assert.match(html, /Pro Pricing &amp; Profit Toolkit/, 'missing secondary CTA');
});

test('build-stage niches never reach the directory', () => {
  const html = committed();
  for (const niche of nicheRegistry.filter(n => n.status !== 'live')) {
    assert.ok(!html.includes(`data-niche="${niche.id}"`), `${niche.id}: build-stage niche must not be listed`);
    assert.ok(!html.includes(niche.calculatorPath), `${niche.id}: build-stage path must not be listed`);
  }
});

test('directory is usable without JavaScript and does not build cards client-side', () => {
  const html = committed();
  assert.match(html, /<script type="module" src="\/assets\/directory-filter\.js"><\/script>/);
  assert.equal((html.match(/<script/g) || []).length, 1, 'directory should load exactly one script');
  const filter = readFileSync(join('public', 'assets', 'directory-filter.js'), 'utf8');
  assert.ok(!/createElement\(['"]article['"]\)/.test(filter), 'filter must not create calculator cards');
  assert.ok(!/niche-registry/.test(filter), 'filter must not read the registry; cards are static');
});

test('no filter control is rendered for visitors without JavaScript', () => {
  const html = committed();
  assert.match(
    html,
    /<div class="directory-controls" data-directory-controls hidden><\/div>/,
    'controls container must ship empty and hidden'
  );
  assert.ok(!html.includes('directory-chip'), 'no chip may be rendered statically');
  assert.ok(!html.includes('<input'), 'no search input may be rendered statically');
  assert.ok(!html.includes('<button'), 'no button may be rendered statically');

  const filter = readFileSync(join('public', 'assets', 'directory-filter.js'), 'utf8');
  assert.match(filter, /chipRow\.append\(chip\('all', 'All', true\)\)/, 'chips must be injected by JS');
  assert.match(filter, /controls\.hidden = false;/, 'controls are revealed only after wiring');
  assert.ok(
    filter.indexOf('controls.hidden = false;') > filter.indexOf("chipRow.addEventListener('click'"),
    'controls must be revealed only after their listeners exist'
  );
});

test('directory Pro Toolkit links are bound and tracked, not just labelled', async () => {
  const html = committed();
  const links = html.match(/data-paid-cta="directory-card"/g) || [];
  assert.equal(links.length, liveNiches().filter(n => n.proUrl).length, 'every Pro link needs the attribute');
  assert.ok(!html.includes('lead-magnet.js'), 'directory must stay self-contained');

  const niche = liveNiches().find(n => n.proUrl);
  const listeners = new Map();
  const link = {
    dataset: { paidCta: 'directory-card', funnel: niche.id },
    closest: sel => (sel === '.directory-card' ? { dataset: { niche: niche.id } } : null)
  };
  const gridStub = {
    addEventListener: (type, fn) => listeners.set(type, fn),
    querySelectorAll: () => [],
    contains: () => true
  };
  const dispatched = [];
  globalThis.window = {
    dataLayer: [],
    dispatchEvent: e => { dispatched.push(e); return true; }
  };
  globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init?.detail; } };
  globalThis.document = {
    querySelector: sel => (sel === '[data-directory-grid]' ? gridStub : null),
    createElement: () => ({ append(){}, setAttribute(){}, classList:{toggle(){}}, dataset:{}, querySelectorAll:()=>[] })
  };

  await import('../public/assets/directory-filter.js');

  const handler = listeners.get('click');
  assert.ok(handler, 'directory must attach a click listener to the grid');
  handler({ target: { closest: sel => (sel === '[data-paid-cta="directory-card"]' ? link : null) } });

  assert.equal(globalThis.window.dataLayer.length, 1, 'click must push exactly one dataLayer entry');
  const pushed = globalThis.window.dataLayer[0];
  assert.deepEqual(pushed, {
    event: 'paid_cta_clicked',
    funnel: niche.id,
    placement: 'directory-card'
  }, 'event shape must match the shared convention');
  assert.equal(dispatched.length, 1, 'click must dispatch one conversion event');
  assert.equal(dispatched[0].type, 'funnel:conversion');
  assert.deepEqual(dispatched[0].detail, pushed);

  delete globalThis.window; delete globalThis.document; delete globalThis.CustomEvent;
});

test('the compact CTA is actually tracked by each runtime, not just labelled', () => {
  const runtimes = [
    'factory-calculator.js',
    'generated-calculator.js',
    'house-cleaning-app.js',
    'mobile-detailing-app.js',
    'pressure-app.js',
    'app.js'
  ];
  for (const runtime of runtimes) {
    const js = readFileSync(join('public', 'assets', runtime), 'utf8');
    const mount = js.indexOf('mountCompactPaidCta(');
    const scan = js.indexOf("querySelectorAll('[data-paid-cta]')");
    assert.ok(mount > -1, `${runtime}: compact CTA is never mounted`);
    assert.ok(scan > -1, `${runtime}: runtime does not register paid-CTA tracking`);
    assert.ok(
      mount < scan,
      `${runtime}: compact CTA is mounted after the [data-paid-cta] scan, so its clicks are untracked`
    );
  }
});

test('no hardcoded Payhip URLs are introduced in generated directory source', () => {
  const directorySource = readFileSync(join('factory', 'directory.mjs'), 'utf8');
  const resultCta = readFileSync(join('public', 'assets', 'result-cta.js'), 'utf8');
  assert.doesNotMatch(directorySource, /payhip\.com/, 'directory renderer must read URLs from the registry');
  assert.doesNotMatch(resultCta, /payhip\.com/, 'compact CTA must read URLs from the registry');
});

test('compact result CTA is shared, registry-driven and idempotent', () => {
  const source = readFileSync(join('public', 'assets', 'result-cta.js'), 'utf8');
  assert.match(source, /import \{ nicheById \}/, 'must resolve products from the registry');
  assert.match(source, /getElementById\(MOUNT_ID\)/, 'must guard against duplicate insertion');
  assert.match(source, /data-paid-cta="result-compact"/, 'compact CTA needs its own tracking placement');

  const runtimes = [
    'factory-calculator.js',
    'generated-calculator.js',
    'house-cleaning-app.js',
    'mobile-detailing-app.js',
    'pressure-app.js',
    'app.js'
  ];
  for (const runtime of runtimes) {
    const js = readFileSync(join('public', 'assets', runtime), 'utf8');
    assert.match(
      js,
      /import \{ mountCompactPaidCta \} from '\.\/result-cta\.js';/,
      `${runtime}: compact CTA not imported`
    );
    assert.equal(
      (js.match(/mountCompactPaidCta\(/g) || []).length,
      1,
      `${runtime}: expected exactly one mount call`
    );
    assert.doesNotMatch(js, /payhip\.com\/b\/[A-Za-z0-9]+["'][^>]*data-paid-cta="result-compact"/,
      `${runtime}: compact CTA must not hardcode a Payhip URL`);
  }
});

test('homepage routes calculator discovery to the directory', () => {
  const home = readFileSync(join('public', 'index.html'), 'utf8');
  assert.match(home, /<div><a href="\/calculators\/">Calculators<\/a>/, 'nav must link to the directory');
  assert.ok((home.match(/href="\/calculators\/"/g) || []).length >= 2, 'homepage needs a prominent directory route');
});

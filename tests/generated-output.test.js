import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { generatedNiches, renderPage } from '../factory/generate-calculator.mjs';

// Guards against generator drift: if a factory niche config changes and `npm run generate` is
// not re-run, the committed pages silently diverge from their source.
//
// This test renders expected HTML IN MEMORY and compares it against what is committed. It never
// writes to public/ — importing the generator does not trigger its write loop.

const factoryPages = generatedNiches().map(config => config.slug);

const read = p => readFileSync(p, 'utf8');

test('committed factory pages match freshly rendered generator output', () => {
  assert.ok(factoryPages.length >= 5, 'expected the generator to own at least five niches');
  for (const config of generatedNiches()) {
    const committed = read(join('public', config.slug, 'index.html'));
    assert.equal(
      renderPage(config),
      committed,
      `${config.slug}: committed page differs from generator output. Run "npm run generate" and commit the result.`
    );
  }
});

test('generated factory pages use the shared paid-first runtime', () => {
  for (const slug of factoryPages) {
    const html = read(join('public', slug, 'index.html'));
    assert.match(html, /id="factory-root"/, `${slug}: missing factory mount point`);
    assert.match(html, /\/assets\/factory-calculator\.js/, `${slug}: not wired to the factory runtime`);
    assert.doesNotMatch(html, /generated-calculator\.js/, `${slug}: still references the legacy runtime`);
    assert.doesNotMatch(
      html,
      /Use the free checklist for a quick cost review/,
      `${slug}: free-first commercial copy has been reintroduced`
    );
    assert.doesNotMatch(html, /payhip\.com/, `${slug}: product URLs must come from niche-registry.js`);
  }
});

test('generated pages keep their SEO metadata and canonical URLs', () => {
  for (const slug of factoryPages) {
    const html = read(join('public', slug, 'index.html'));
    assert.match(html, /<title>[^<]{20,}<\/title>/, `${slug}: weak or missing title`);
    assert.match(html, /<meta name="description" content="[^"]{60,}"/, `${slug}: weak or missing description`);
    assert.match(
      html,
      new RegExp(`<link rel="canonical" href="https://servicepricingtools\\.com/${slug}/">`),
      `${slug}: missing or incorrect canonical URL`
    );
    assert.match(html, /<h1>/, `${slug}: missing h1`);
  }
});

test('hand-maintained legacy calculator pages are not generated', () => {
  const legacy = [
    'dog-grooming-price-calculator',
    'house-cleaning-price-calculator',
    'lawn-care-price-calculator',
    'mobile-car-detailing-price-calculator',
    'pressure-washing-price-calculator'
  ];
  const generator = read(join('factory', 'generate-calculator.mjs'));
  for (const slug of legacy) {
    assert.ok(existsSync(join('public', slug, 'index.html')), `${slug}: page is missing`);
    assert.ok(
      !generator.includes(`'./niches/${slug.replace('-price-calculator', '')}.js'`),
      `${slug}: legacy page must not be driven by the generator`
    );
  }
});

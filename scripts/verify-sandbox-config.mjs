#!/usr/bin/env node
/**
 * Pre-deployment guard for the quote generator sandbox Worker.
 *
 * Runs before `wrangler deploy --env sandbox` in CI and fails closed.
 * Its job is to make "we will never touch production" a mechanical
 * guarantee rather than a convention, and to confirm the sandbox env
 * points at the EU-jurisdiction R2 bucket and the existing D1 database.
 *
 * Exit 0 = safe to deploy. Any non-zero exit must block deployment.
 */

import { readFileSync } from 'node:fs';

const EXPECTED = {
  sandboxWorker: 'service-business-repository-sandbox',
  productionWorker: 'service-business-repository',
  d1Binding: 'QUOTE_DB',
  d1Name: 'spt-quotes-sandbox',
  d1Id: '508f48d8-b691-4205-9363-f7ff89fbd072',
  r2Binding: 'QUOTE_FILES',
  r2Bucket: 'spt-quotes-sandbox-private',
  r2Jurisdiction: 'eu',
  paymentMode: 'sandbox',
};

const errors = [];
const notes = [];

/** Strip // and block comments so JSONC parses with JSON.parse. */
function parseJsonc(text) {
  let out = '';
  let inString = false;
  let inLine = false;
  let inBlock = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (inLine) {
      if (ch === '\n') { inLine = false; out += ch; }
      continue;
    }
    if (inBlock) {
      if (ch === '*' && next === '/') { inBlock = false; i += 1; }
      continue;
    }
    if (inString) {
      out += ch;
      if (ch === '\\') { out += next ?? ''; i += 1; continue; }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; out += ch; continue; }
    if (ch === '/' && next === '/') { inLine = true; i += 1; continue; }
    if (ch === '/' && next === '*') { inBlock = true; i += 1; continue; }
    out += ch;
  }
  return JSON.parse(out);
}

const config = parseJsonc(readFileSync('wrangler.jsonc', 'utf8'));
const sandbox = config.env?.sandbox;

if (!sandbox) {
  console.error('FATAL: wrangler.jsonc has no env.sandbox block.');
  process.exit(1);
}

// --- Worker identity -------------------------------------------------------
// The single most important check: the sandbox env must declare its own
// name, and that name must not be the production Worker.
if (sandbox.name !== EXPECTED.sandboxWorker) {
  errors.push(`env.sandbox.name is "${sandbox.name}", expected "${EXPECTED.sandboxWorker}".`);
}
if (sandbox.name === EXPECTED.productionWorker || sandbox.name === config.name) {
  errors.push(`env.sandbox.name collides with the production Worker "${config.name}". Refusing to deploy.`);
}
if (config.name !== EXPECTED.productionWorker) {
  notes.push(`Top-level Worker name is "${config.name}" (expected "${EXPECTED.productionWorker}"). Not fatal, but verify.`);
}

// --- D1 --------------------------------------------------------------------
const d1 = (sandbox.d1_databases || []).find(d => d.binding === EXPECTED.d1Binding);
if (!d1) {
  errors.push(`No D1 binding "${EXPECTED.d1Binding}" in env.sandbox.`);
} else {
  if (d1.database_name !== EXPECTED.d1Name) {
    errors.push(`D1 database_name is "${d1.database_name}", expected "${EXPECTED.d1Name}".`);
  }
  if (d1.database_id !== EXPECTED.d1Id) {
    errors.push(`D1 database_id is "${d1.database_id}", expected "${EXPECTED.d1Id}". A wrong id would create or target the wrong database.`);
  }
}

// --- R2 --------------------------------------------------------------------
// The jurisdiction matters: without "eu" the binding resolves to a
// default-jurisdiction bucket, which would silently create a second,
// non-EU bucket of the same name and put quote files outside the EU.
const r2 = (sandbox.r2_buckets || []).find(b => b.binding === EXPECTED.r2Binding);
if (!r2) {
  errors.push(`No R2 binding "${EXPECTED.r2Binding}" in env.sandbox.`);
} else {
  if (r2.bucket_name !== EXPECTED.r2Bucket) {
    errors.push(`R2 bucket_name is "${r2.bucket_name}", expected "${EXPECTED.r2Bucket}".`);
  }
  if (r2.jurisdiction !== EXPECTED.r2Jurisdiction) {
    errors.push(`R2 jurisdiction is "${r2.jurisdiction ?? '(unset)'}", expected "${EXPECTED.r2Jurisdiction}". Deploying without it would target a non-EU bucket.`);
  }
}

// --- Payment safety --------------------------------------------------------
const vars = sandbox.vars || {};
if (vars.QUOTE_PAYMENT_MODE !== EXPECTED.paymentMode) {
  errors.push(`QUOTE_PAYMENT_MODE is "${vars.QUOTE_PAYMENT_MODE}", expected "${EXPECTED.paymentMode}".`);
}
if ('QUOTE_LIVE_APPROVED' in vars) {
  errors.push('QUOTE_LIVE_APPROVED must not be set in wrangler.jsonc. Live payments stay off.');
}

// Credentials must never be committed.
for (const key of Object.keys(vars)) {
  if (/PAYPAL|TOKEN|SECRET|API_KEY/i.test(key)) {
    errors.push(`Credential-shaped var "${key}" found in wrangler.jsonc. These belong in Worker secrets, not the repo.`);
  }
}

// --- Support email ---------------------------------------------------------
// Mirrors the regex in src/quote-api.js. An invalid address keeps checkout
// closed by design, so this is a warning, not a failure.
const email = vars.QUOTE_SUPPORT_EMAIL || '';
const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
if (!emailValid) {
  notes.push(`QUOTE_SUPPORT_EMAIL is "${email || '(unset)'}" and is not a valid address. Checkout will stay CLOSED after deploy. This is the intended safe state until a monitored address is supplied.`);
}

// --- Report ----------------------------------------------------------------
console.log('Sandbox pre-deployment verification');
console.log('-----------------------------------');
console.log(`  Worker to deploy : ${sandbox.name}`);
console.log(`  Production Worker: ${config.name} (will NOT be touched)`);
console.log(`  D1               : ${d1?.database_name} / ${d1?.database_id}`);
console.log(`  R2               : ${r2?.bucket_name} (jurisdiction: ${r2?.jurisdiction})`);
console.log(`  Payment mode     : ${vars.QUOTE_PAYMENT_MODE}`);
console.log(`  Checkout         : ${emailValid ? 'OPEN (support email valid)' : 'CLOSED (support email not set)'}`);
console.log('');

for (const n of notes) console.log(`NOTE: ${n}`);
if (notes.length) console.log('');

if (errors.length) {
  console.error('BLOCKED — deployment must not proceed:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log('All checks passed. Safe to deploy env.sandbox.');

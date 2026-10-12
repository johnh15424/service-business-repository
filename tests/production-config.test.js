import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const config=JSON.parse(readFileSync('wrangler.jsonc','utf8').replace(/^\s*\/\/.*$/gm,''));

test('production config is isolated from sandbox and never commits the live approval',()=>{
  assert.equal(config.name,'service-business-repository');
  assert.ok(!('QUOTE_LIVE_APPROVED' in config.vars));
  for(const key of Object.keys(config.vars))assert.doesNotMatch(key,/PAYPAL|SECRET|TOKEN/);
  assert.match(config.vars.QUOTE_SUPPORT_EMAIL,/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  const sandbox=config.env.sandbox;
  assert.notEqual(config.d1_databases[0].database_id,sandbox.d1_databases[0].database_id);
  assert.notEqual(config.r2_buckets[0].bucket_name,sandbox.r2_buckets[0].bucket_name);
  assert.equal(config.r2_buckets[0].jurisdiction,'eu');
  assert.notEqual(config.ratelimits[0].namespace_id,sandbox.ratelimits[0].namespace_id);
  assert.equal(sandbox.vars.QUOTE_PAYMENT_MODE,'sandbox');
});

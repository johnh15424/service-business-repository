# Production deployment (GitHub Actions)

Workflow: `.github/workflows/deploy-production.yml` — manual only, runs from `main`.

## What a deploy run does, in order

1. Refuses unless the Worker name is typed exactly and the run was launched from `main`.
2. Confirms `APPROVED_SHA` is a commit of the approved PR and every check on it passed.
3. Checks out exactly that commit (no stored git credentials).
4. Confirms the Cloudflare token can reach `service-business-repository`.
5. Reads production D1 (read-only): `0004_quote_currency.sql` recorded, `quotes.price_currency` present, and every migration in the commit already applied.
6. Clean `npm ci`, syntax checks, full test suite, config guard, approved-price check (EUR 4.00 / USD 4.99 / GBP 3.49, EUR-only when the gate is unset) and a production Wrangler dry run. It refuses if `QUOTE_CURRENCIES_APPROVED` or `keep_vars` appears in config.
7. Records a baseline: the current version ID (the rollback target), Worker secret names, and the public `/api/quotes/config`. It refuses if `QUOTE_CURRENCIES_APPROVED` is set as a secret.
8. Deploys with `wrangler deploy`, tagged with the PR and commit.
9. Verifies: the new version serves 100%, secret names are unchanged, the public site serves the approved `quote-model.js`, checkout currencies are exactly `[EUR 400]`, payment mode and checkout availability match the baseline, and the home page returns 200.
10. If any verification fails after the deploy, it **rolls back automatically** to the baseline version.

Non-EUR checkout stays off. It turns on only when `QUOTE_CURRENCIES_APPROVED=USD,GBP` is set on the Worker, which this workflow never does.

## Rollback

Actions → **Deploy Production Worker** → Run workflow → operation `rollback`, confirm `service-business-repository`, and paste the version ID from the deploy summary (leave blank for the previous version). Older code ignores `price_currency`, so rolling back with migration 0004 applied is safe.

Workers Builds deploys `main` to production on every push. After a successful run, merge the approved PR so the next push to `main` doesn't put the old code back. If you roll back, revert that merge on `main` as well.

## One-time setup from a phone (about 3 minutes)

**Cloudflare token** (dash.cloudflare.com in a mobile browser):

1. Profile icon → **My Profile** → **API Tokens** → **Create Token** → **Create Custom Token**.
2. Name: `github-production-deploy`.
3. Permissions (Account scope, two rows):
   - **Workers Scripts — Edit**
   - **D1 — Read**
4. Account Resources: **Include → this account only**. Zone permissions: none. Optional: client IP filtering stays off (GitHub runners rotate IPs). Optional TTL.
5. **Continue to summary** → **Create Token** → copy it once.

**GitHub secrets** (github.com in a mobile browser; the GitHub app cannot set secrets):

1. Repository → **Settings** → **Environments** → **New environment** → `production`.
2. Optional: tick **Required reviewers** and add yourself to get a second approval tap.
3. **Add environment secret**: `CLOUDFLARE_API_TOKEN` = the token from above.
4. **Add environment secret**: `CLOUDFLARE_ACCOUNT_ID` = `4552c36b53ade2914371e64fe1bb8083`.

The existing sandbox token is scoped to the sandbox Worker and lives in the `sandbox` environment, so it can't deploy production. That separation is deliberate.

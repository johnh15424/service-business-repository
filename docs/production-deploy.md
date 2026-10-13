# Production deployment (GitHub Actions)

Workflows:
- `.github/workflows/deploy-production.yml`: manual only, runs from `main` and deploys that `main` commit.
- `.github/workflows/verify-production.yml`: manual, read-only. Checks whatever production is serving, however it was deployed.
- `.github/workflows/browser-qa.yml`: every PR. 20-calculator browser matrix, the complete €4 quote journey against a fake PayPal, and an audit of the deployed branch preview.

## What a deploy run does, in order

1. Refuses unless the Worker name is typed exactly and the run was launched from `main`.
2. Confirms the `main` commit it was launched from passed CI (`test`) and no check on it failed.
3. Checks out exactly that commit (no stored git credentials).
4. Confirms the Cloudflare token can reach `service-business-repository`.
5. Reads production D1 (read-only): `0004_quote_currency.sql` recorded, `quotes.price_currency` present, and every migration in the commit already applied.
6. Clean `npm ci`, syntax checks, full test suite, config guard, approved-price check (EUR 4.00 / USD 4.99 / GBP 3.49, EUR-only when the gate is unset) and a production Wrangler dry run. It refuses if `QUOTE_CURRENCIES_APPROVED` or `keep_vars` appears in config.
7. Records a baseline: the current version ID (the rollback target), Worker secret names, and the public `/api/quotes/config`. It refuses if `QUOTE_CURRENCIES_APPROVED` is set as a secret.
8. Deploys with `wrangler deploy`, tagged with the PR and commit.
9. Verifies: the new version serves 100%, secret names are unchanged, the public site serves the approved `quote-model.js`, checkout currencies are exactly `[EUR 400]`, payment mode and checkout availability match the baseline, the home page returns 200, and a real-browser audit of all 20 calculators passes on production.
10. If any verification fails after the deploy, it **rolls back automatically** to the baseline version.

Non-EUR checkout stays off. It turns on only when `QUOTE_CURRENCIES_APPROVED=USD,GBP` is set on the Worker, which this workflow never does.

## Rollback

Actions → **Deploy Production Worker** → Run workflow → operation `rollback`, confirm `service-business-repository`, and paste the version ID from the deploy summary (leave blank for the previous version). Older code ignores `price_currency`, so rolling back with migration 0004 applied is safe.

Cloudflare Workers Builds also deploys `main` to production on every push, so production normally serves `main` within a few minutes of a merge. Run **Verify Production** after each merge (optionally with the merged commit as `expected_sha`). If you roll back, revert the merge on `main` as well, or the next push redeploys it.

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

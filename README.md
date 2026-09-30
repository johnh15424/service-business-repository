# Service Business Calculators · Dog Grooming v3

A dependency-free, specialist dog grooming pricing product. Production assets live **only in `public/`**. Existing prototype files are preserved in `archive/` and Git history, outside deployment.

## Production

- Cloudflare Worker: `service-business-repository`
- Origin: https://service-business-repository.irishambience.workers.dev
- Main calculator: `/dog-grooming-price-calculator/`
- Pricing and formula guide: `/grooming-pricing-guide/`
- Deploy command: existing Cloudflare Git integration runs `npx wrangler deploy` on `main`.
- `wrangler.jsonc` fixes the asset directory at `./public`; no build step or new account settings are required.
- Real 404 responses prevent unknown routes from masquerading as calculators.
- Do not change the asset directory to `.`. That previously uploaded `.git` metadata and README files.

## Development and checks

Requires Node 20+ for tests. No package installation is needed.

```sh
npm test
npm run check
npm run preview
```

Open http://localhost:8080/dog-grooming-price-calculator/ for local development. The Python preview does not emulate Cloudflare redirects or response headers.

## Architecture

- `public/assets/pricing.js`: pure currency-neutral economics with explicit validation; no niche or country defaults.
- `public/assets/profiles.js`: dog-grooming examples and versioned, sourced country/tax references.
- `public/assets/app.js`: input validation, accessible results, local save, JSON estimate export.
- Static HTML: crawlable headings, explanations and visible FAQ without requiring JS.
- `tests/`: numerical regressions and production-boundary checks, never served.
- `docs/`: formula decisions, workbook reconciliation and rollout notes, never served.

Before adding another vertical, build its own service model, validate domain assumptions and add meaningful fixtures. Do not reuse grooming presets as generic service logic.

## Commercial scope

The free calculator is operational. A workbook placeholder is informational only; no checkout, invented payment link, email collection or paid service has been enabled. The existing paid-workbook candidate is not served as a free asset. Review and reconcile that workbook before sale. No analytics or third-party fonts are loaded.

## Rollback

Changes are a reversible Git commit. Use a forward revert of the release commit to restore the exact prior tree if necessary, but note that the old deployment was broken and served the repository root. Prefer a fix-forward or a rollback retaining the restricted `public/` asset directory. Never force-push `main`.

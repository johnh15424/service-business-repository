# Service Pricing Tools · Dog Grooming v3.1

A dependency-free, specialist dog grooming pricing product. Production assets live **only in `public/`**. Existing prototype files are preserved in `archive/` and Git history, outside deployment.

## Production

- Public domain: https://servicepricingtools.com
- Cloudflare Worker: `service-business-repository`
- Infrastructure origin: https://service-business-repository.irishambience.workers.dev
- Main calculator: `/dog-grooming-price-calculator/`
- Pricing and formula guide: `/grooming-pricing-guide/`
- Payhip Pro Toolkit: https://payhip.com/b/7pXUm
- Deploy command: existing Cloudflare Git integration runs `npx wrangler deploy` on `main`.
- `wrangler.jsonc` fixes the asset directory at `./public`; no build step is required.
- Real 404 responses prevent unknown routes from masquerading as calculators.
- Do not change the asset directory to `.`. That previously uploaded `.git` metadata and README files.

## Development and checks

Requires Node 20+ for tests.

```sh
npm test
npm run check
npm run preview
```

Open http://localhost:8080/dog-grooming-price-calculator/ for local development. The Python preview does not emulate Cloudflare redirects or response headers.

## Architecture

- `public/assets/pricing.js`: pure currency-neutral economics with explicit validation; no niche or country defaults.
- `public/assets/profiles.js`: dog-grooming examples and versioned, sourced country/tax references.
- `public/assets/app.js`: input validation, accessible results, local save, JSON estimate export and provider-neutral conversion hooks.
- Static HTML: crawlable headings, explanations and visible FAQ without requiring JS.
- `tests/`: numerical regressions and production-boundary checks, never served.
- `docs/`: formula decisions, workbook reconciliation and rollout notes, never served.

Before adding another vertical, build its own service model, validate domain assumptions and add meaningful fixtures. Do not reuse grooming presets as generic service logic.

## Commercial scope

The free Dog Grooming Price Calculator is operational. The Pro Toolkit is published through Payhip at €24.99 and is linked from the calculator and supporting content. Payhip handles checkout and digital fulfilment. The site emits provider-neutral client-side hooks for calculator views, completed estimates and paid CTA clicks; no hosted analytics provider is connected yet.

Supporting content currently targets dog-grooming pricing, business costs, margin, mobile pricing and service-menu intent. `sitemap.xml`, `robots.txt` and IndexNow infrastructure use the custom domain.

## Rollback

Changes are reversible Git commits. Prefer fix-forward or a forward revert while retaining the restricted `public/` asset directory. Never force-push `main`.

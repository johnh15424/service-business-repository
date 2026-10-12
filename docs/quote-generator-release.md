# Professional Quote Generator release preparation

Status: implemented for review, NOT production-ready. Keep PR #31 in draft. Do not merge or enable real-money checkout until the gates below pass.

## Account and architecture audit (8 October 2026)

- Branch audited at 374738764221bfc34459ab59594f23b9e0e88ab3; PR #31 open/draft.
- Six runtimes serve the 20 calculator routes in this checkout: factory, generated, Dog Grooming, Pressure Washing, House Cleaning and Mobile Car Detailing. All now mount the same editor and pass numerical result data through a customer-facing allowlist. Future factory/generated pages inherit this.
- Existing Cloudflare Worker originally serves static assets and injects GA4 G-J3BBT6YZRB. No database, private file storage or payment API bindings were configured in the repository.
- Existing Payhip account observed: Service Pricing Tools, EUR default, PayPal connected, Stripe not connected. No payment/account/product settings changed.
- Cloudflare dashboard is signed out; no Cloudflare or PayPal API credential variables are available in this execution environment.

## Payment choice

Payhip supports order metadata and sale/refund callbacks, but its documented signature is SHA-256 of the API key, not a message-specific MAC. Its public API documents coupon and licence management rather than order retrieval, creation and capture. These are limitations for strong order reconciliation and preventing duplicate charges for one immutable quote. Do not claim Payhip cannot support any custom fulfilment; it can, but its documented interfaces did not meet this implementation's release requirements.

Use Orders v2 against the already connected PayPal merchant account, subject to that account having direct REST access. This does not require a new payment provider or subscription. The code does NOT activate or create a PayPal app/account. Sandbox authorisation is still required.

References:
- https://help.payhip.com/article/115-webhooks
- https://help.payhip.com/article/126-direct-checkout-link
- https://help.payhip.com/article/347-public-api
- https://developer.paypal.com/studio/checkout/standard/integrate
- https://developer.paypal.com/api/rest/integration/orders-api
- https://developer.paypal.com/api/rest/webhooks/rest/

## Implemented behaviour

- Editable business/customer details, itemised services, reference, date, validity, terms and two designs.
- No margin, labour, overhead or profit fields are accepted into quotation snapshots.
- Country/currency reused. VAT/tax remains an explicit issuer choice. Server recomputes totals using integer minor units. Tax rounding can differ by one minor unit from legacy calculators that round only for display; the quote is the authoritative customer-facing amount.
- PNG/JPEG/WebP/AVIF signatures and extensions checked. Images rasterised locally; PDF.js renders PDF page 1 with eval/XFA disabled. 5 MB input, 16 MP raster input, 1200px output and approximately 1 MB converted PNG limits. Browser codec support is still a compatibility gate.
- Server independently validates bounded PNG signatures/dimensions and embeds only image pixels. User PDFs are never embedded as executable PDF content.
- Embedded DejaVu fonts, A4 pagination, repeated item headers, wrapping and footer page counts. Latin, Greek and Cyrillic supported. Unsupported characters are rejected before checkout rather than silently missing. Other scripts require additional fonts before claiming support.
- Final and watermarked preview PDFs are generated before checkout. Final files are private R2 objects; only watermarked preview is exposed before payment.
- An immutable PDF is identified by a random quote UUID and a 256-bit opaque bearer capability whose hash is stored in D1. This intentionally uses a server-validated opaque token instead of a client-trusted signed payload. It provides revocation, expiry and no customer data in the URL. Fragment tokens are NOT payment proof.
- Create checkout uses one stable PayPal request ID per quote, a D1 conditional lock and one unique provider order. Ambiguous responses retry the same key within 5 hours, below the default 6-hour provider idempotency window. The same completed quote cannot start a second checkout.
- Server captures approved orders; provider GET re-verifies order ID, custom quote ID, merchant, CAPTURE intent, completed status, exactly one capture and the EUR amount recorded on the quote at order creation (EUR 4.00 now; EUR 3.00 for earlier orders). Return URL parameters are ignored as payment proof.
- Webhooks use PayPal's signature verification endpoint. Approved/completed events are retry-safe. Refund/reversal events revoke access; every download also retrieves current capture status so a missed refund webhook cannot grant a new download.
- No subscription, account creation, toolkit price change, MailerLite modification or advertising setting change.

## Infrastructure and owner action required

Use the existing Cloudflare account/Worker and existing PayPal account. Do not paste secrets in chat or commit them.

1. Sign in to Cloudflare so a sandbox-only environment can be configured. Authorise the required D1/R2 resources only after checking the existing account's quotas/costs. No paid resources were provisioned here.
2. In the existing PayPal Developer account, authorise a sandbox REST application. Securely configure its client ID/secret, the sandbox merchant ID and the webhook ID in Cloudflare secrets. No new live payment-provider account is requested.
3. Set QUOTE_SUPPORT_EMAIL to a monitored business support address. This is required before checkout can be enabled. Review the customer support/refund process and seller tax treatment of the EUR 3 quotation-generation service.
4. Configure QUOTE_DB (D1), QUOTE_FILES (private R2), QUOTE_LIMITER (Cloudflare rate-limiter binding), migration migrations/0001_quotes.sql and a daily cleanup cron. R2 must have no public URL/domain. Add an 8-day lifecycle expiry as an orphan-object safety net. D1 cleanup removes content-free order metadata and events after 7 days; PayPal retains its own transaction records independently.
5. Set QUOTE_PAYMENT_MODE=sandbox only in the isolated test environment. Leave production disabled. Bind sandbox credentials to the sandbox environment only.
6. Configure webhook URL /api/quotes/paypal-webhook for CHECKOUT.ORDER.APPROVED, PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.DENIED, PAYMENT.CAPTURE.REFUNDED and PAYMENT.CAPTURE.REVERSED.

Required secrets: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MERCHANT_ID, PAYPAL_WEBHOOK_ID.
Required non-secret vars: QUOTE_PAYMENT_MODE, QUOTE_SUPPORT_EMAIL.
The runtime additionally requires QUOTE_LIVE_APPROVED=e2e-verified for live mode. Do not set this based on unit tests or code review alone.

## Analytics and privacy

- First-party D1 event ledger records preview completion, checkout, payment verification, PDF serving/delivery acknowledgement and fulfilment failure. Unique event keys prevent duplicate purchase fulfilment records.
- Frontend events: quote_builder_opened, quote_preview_updated, quote_preview_completed, quote_checkout_started, quote_payment_verified, quote_pdf_delivered, quote_fulfilment_failed and GA4 purchase with product_type=professional_quote, EUR 3 and a quote-specific transaction ID.
- The recovery page bypasses the sitewide tag injection entirely. Optional purchase measurement is off until selected; when selected it explicitly overrides page_location/page_referrer to omit the private fragment and provider query strings. Never record quote/customer/business text or logos in analytics.
- Download success means the PDF bytes arrived and the browser download was initiated, not proof the user saved the file on disk. Client acknowledgement records that distinction.
- GA4/Google Ads account configuration and live receipt of purchase events remain unverified. No Google Ads budget, campaign or conversion settings changed.
- No draft customer data is stored in localStorage. Draft data stays in page memory until preview preparation. D1 stores only niche/currency/template plus order/access metadata; customer content is in the two private PDFs.

## Validation performed so far

- npm test: 85 passing tests after implementation; includes existing calculator regression tests plus quote arithmetic, data allowlisting, six-runtime route coverage, file signatures, actual A4 PDF rendering/pagination, checkout idempotency, exact server payment checks, CSRF, invalid webhooks, refund ordering, download authorisation and expiry cleanup.
- npm run check: passes, including new modules.
- Wrangler deploy --dry-run: passed; Worker approximately 640 KiB gzipped before final documentation changes.
- Classic/Modern samples rendered with Poppler and visually inspected. Six-page long-description sample inspected for continuation layout.
- PayPal is mocked in automated tests. These tests are NOT provider sandbox end-to-end evidence.
- Local Worker emulation was blocked by environment network-interface restrictions. A Node preview harness uses the real API/rendering modules with in-memory local storage and payments disabled.
- Cloud Browser could not access the local preview address. Branch-preview browser QA will be recorded separately when available.

## Sandbox deployment status (10 October 2026)

Verified through the connected Cloudflare account (API access via connector, not Wrangler):
- Production Worker `service-business-repository` exists and was NOT modified or deployed.
- Sandbox Worker `service-business-repository-sandbox` does NOT exist yet. Deployment needs an authenticated Wrangler session (API token with Workers Scripts, D1, R2 and Workers Routes edit) from an environment that can reach api.cloudflare.com.
- D1 `spt-quotes-sandbox` (508f48d8-…072): migration 0001 applied; tables `quotes`, `quote_events`, index `quotes_expiry` and Wrangler's `d1_migrations` record created so `wrangler d1 migrations apply` will not re-apply it.
- R2 `spt-quotes-sandbox-private` NOT created. The connector cannot set jurisdiction and creating it without `eu` would mismatch the binding (jurisdiction cannot be changed later). Create it in the dashboard (R2 > Create bucket > Specify jurisdiction: EU, no public access, lifecycle delete after 8 days) or `wrangler r2 bucket create spt-quotes-sandbox-private --jurisdiction eu`.
- Rate limiter (namespace 3101, 30/60s) and cron `17 3 * * *` are config only; they take effect on sandbox deploy. Cost at test volumes is within D1/R2/Workers free allowances; cron triggers count against the account's cron limit.
- `wrangler deploy --dry-run --env sandbox` resolves all bindings (640 KiB gzipped).
- `QUOTE_SUPPORT_EMAIL` is still a placeholder. Checkout now stays closed and the address is hidden until it is a valid email.

PayPal sandbox: not integrated yet. No secrets set (Worker absent; credentials must be entered by the owner with `wrangler secret put … --env sandbox`, never in chat). Webhook not registered (no HTTPS endpoint yet). No genuine PayPal sandbox transaction has been completed.

Local browser QA (Playwright/Chromium, desktop + iPhone 13 + Pixel 7 emulation, payments disabled, in-memory storage; NOT real devices or real Cloudflare/PayPal): 50/50 checks passed — editor opens on 4 calculator runtimes without horizontal overflow, valid logo accepted, malformed/mismatched/>5 MB/>16 MP logos rejected with clear messages, A4 watermarked preview with embedded DejaVu fonts, Greek/Cyrillic text, logo and 2-page pagination, unpaid download refused (403), forged token refused (404), recovery link reopens the quote in a fresh browser context.

## First sandbox deployment run (GitHub Actions)

Workflow: `.github/workflows/deploy-quote-sandbox.yml` (manual only; must be on `main` to show a Run button — PR #37). It always deploys `feature/quote-generator-preview` with `--env sandbox` to `service-business-repository-sandbox`.

Token: create the sandbox Worker once in the dashboard (empty Hello World named exactly `service-business-repository-sandbox`), then use an account API token with **Workers: Editor scoped to that single Worker** only. Creating a Worker needs product-level Workers Admin, which could also change production, so pre-creating it keeps the CI token unable to touch `service-business-repository`. Bindings to D1/R2 need no extra permissions; no zone/route permissions are needed (workers.dev only). If the dashboard only offers legacy permissions, use Account > Workers Scripts: Edit restricted to this account.

GitHub secrets (Settings > Environments > sandbox): `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and when ready `PAYPAL_SANDBOX_CLIENT_ID`, `PAYPAL_SANDBOX_CLIENT_SECRET`, `PAYPAL_SANDBOX_MERCHANT_ID`, `PAYPAL_SANDBOX_WEBHOOK_ID`.

## International checkout currency (12 October 2026)

Most target customers are in the United States, so the checkout can now charge in the buyer's own
currency. Nothing about the EUR 4.00 price has changed, and no non-EUR price is live.

### How it is gated

`QUOTE_CURRENCIES_APPROVED` is a release gate in the same spirit as `QUOTE_LIVE_APPROVED`. Unset, the
site is EUR-only and behaves exactly as before: one currency in the selector (hidden), EUR orders, EUR
verification. Setting it to `USD,GBP` on the deployed Worker turns those on. It is deliberately not
committed to `wrangler.jsonc`, and a test fails if it ever is. A code with no price point in
`CHECKOUT_PRICES` can never be enabled however the variable is spelled.

### Price points — APPROVED BY OWNER, 12 October 2026

USD 4.99, GBP 3.49 and EUR 4.00 are approved. They sit in `CHECKOUT_PRICES`
(`public/assets/quote-model.js`). Approval of the amounts is not activation: USD and GBP remain inert
until `QUOTE_CURRENCIES_APPROVED` is set on the deployed Worker, which is gated on the sandbox evidence
below. ECB reference rates for 12 October 2026: EUR/USD 1.1181, EUR/GBP 0.84478, so EUR 4.00 is
USD 4.47 / GBP 3.38.

| Currency | Proposed | Straight conversion | In EUR at today's rate | Why |
| --- | --- | --- | --- | --- |
| EUR | 4.00 | — | 4.00 | Unchanged live price. |
| USD | 4.99 | 4.47 | 4.46 | Standard price point in the main target market; the ~12% margin over conversion absorbs PayPal's cross-border and FX spread, which lands on us when we settle to a EUR balance. |
| GBP | 3.49 | 3.38 | 4.13 | Nearest clean point above conversion; keeps UK within a few cent of the euro price. |

Prices are not negotiated at runtime and never come from the browser. Changing a number later is a
one-line edit plus a test update.

### Behaviour

- Default currency comes from Cloudflare's own `request.cf.country` at the edge. No geolocation service,
  no new subscription. US and US territories map to USD, GB/GG/IM/JE to GBP, the euro area to EUR.
- Visitors can override the default with a selector next to the pay buttons. The choice is kept in
  `sessionStorage` for the tab, and the server's `/api/quotes/config` list is the only source of what may
  be offered. A stored choice that is no longer offered is discarded.
- A country whose currency we do not charge in falls back to EUR, and the page says so before payment,
  naming the currency it could not use where it knows it ("We cannot charge in CAD yet…").
- The total and both pay buttons always show the amount and currency about to be charged.
- Once a PayPal order exists its currency is fixed: PayPal prices an order at creation, so a later switch
  is refused with 409 and the selector is locked to the prepared currency rather than charging a
  different amount from the one on screen. Creating a new preview releases the lock.
- The currency is part of the PayPal request ID (`<quote>-<CUR>-<minor>`), so a retry can never reuse an
  order created at another price or in another currency. Duplicate-checkout prevention is unchanged.
- The PayPal JS SDK is priced per currency, so it is loaded once per currency into its own
  `data-namespace`; card fields are torn down and re-rendered when the currency changes.
- `price_currency` (migration `0004_quote_currency.sql`) records what the order was created in. Capture
  verification, the per-download capture re-check and the status endpoint all read it back. NULL means an
  order from before this change: still verified as EUR, never re-priced.
- GA4 `purchase`, `paid_purchase` and `quote_payment_verified` report the recorded currency and amount,
  so Ads revenue matches PayPal settlement. The one-sale-per-transaction guard is unchanged.
- Consent handling, refund and reversal revocation, idempotency and expiry are untouched.

### Owner actions

1. ~~Approve or amend the USD and GBP price points above.~~ Done, 12 October 2026.
2. Confirm on the PayPal merchant account whether USD and GBP are **received** currencies or auto-converted
   to the EUR balance, and at what conversion spread. PayPal supports all three for Orders v2
   (25 currencies; EUR, USD and GBP are all two-decimal), but whether this account holds balances or
   converts on receipt is account-specific and changes the margin on the table above. STILL OPEN: no
   PayPal credential exists in any environment reachable from CI or an agent session, so this cannot be
   answered from code.
3. Review the seller tax treatment of charging non-EUR for the quotation-generation service.
4. After sandbox e2e in all three currencies, set `QUOTE_CURRENCIES_APPROVED=USD,GBP` on the Worker
   (`npx wrangler secret put` is not needed; it is a plain var). Leave it unset to stay EUR-only.

### Blockers requiring merchant-account access

- **PayPal merchant currency handling is unverified.** No PayPal credentials are available in this
  environment, so the account's received-currency configuration, cross-border fees and FX spread could not
  be checked. This is the one open question behind the proposed price points.
- **Per-currency buyer eligibility is unverified.** `providerReadiness` still probes card-field
  eligibility in EUR only. PayPal computes eligibility per request, including buyer country, so USD and
  GBP card availability must be observed in the sandbox round trip rather than assumed.
- No sandbox transaction has been run in any currency; see the gates below.

## Release gates still open

- Real sandbox order approval/capture/webhook round trip and immediate download on the configured Worker, run separately for USD, GBP and EUR, with the PayPal-side amount and currency checked against the quote row each time.
- Card-field eligibility observed per currency on a real buyer browser, since PayPal computes it per request.
- GA4 DebugView confirms a USD and a GBP sale report their own currency and value, not EUR.
- Cancel/decline, ambiguous network failures, concurrent retries, webhook replay/refund, expired recovery link and private R2 access checks on actual Cloudflare services.
- Actual iPhone Safari and Android Chrome testing, including all six logo formats, PDF first-page conversion, oversized/malformed files and recovery links after leaving the tab.
- Browser layout and logo tests on the branch preview, including multiple-page A4 preview.
- Private recovery URL fragment survives the actual PayPal redirect and provides reliable recovery after browser interruption.
- Hosted checkout supports the required guest journey on this merchant account and buyer regions. No SPT account is required; PayPal guest-card availability cannot be assumed until tested.
- Resource quotas, privacy/support text, merchant tax treatment, refund handling and operational monitoring approved.
- GA4 DebugView confirms purchase value/currency/product identity and no private URL data; Google Ads conversion import reviewed separately without changing budgets.
- Complete regression and preview deployment verification, then owner-approved live release. PR remains draft and unmerged until these pass.

## Commands

npm ci
npm run check
npm test
npm run samples:quotes
npm run preview:quotes
npx wrangler deploy --dry-run

Do not add mock payment endpoints to the public Worker. Do not disable the payment gate to make a demo appear complete.

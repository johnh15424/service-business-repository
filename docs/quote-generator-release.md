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
- Server captures approved orders; provider GET re-verifies order ID, custom quote ID, merchant, CAPTURE intent, completed status, exactly one capture and EUR 3.00. Return URL parameters are ignored as payment proof.
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

## Release gates still open

- Real sandbox order approval/capture/webhook round trip and immediate download on the configured Worker.
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

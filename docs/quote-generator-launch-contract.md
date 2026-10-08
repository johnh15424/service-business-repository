# Quote Generator launch contract

## Customer promise
- €3 **one-time payment** for a branded, downloadable customer-specific PDF quotation.
- No automatic subscription, no registration requirement, no implied VAT rate, no hidden billing.
- Preview freely before checkout. Payment only becomes available when secure fulfilment is tested.
- Quote, not tax invoice. Tax applicability and VAT registration must be selected/confirmed by the issuer.

## Architecture
- Shared quote data model across factory, generated and legacy dog-grooming calculators.
- Source from the existing calculation result; expose customer-facing pricing only.
- Inputs: business/customer details, quote reference, validity, scope, terms, optional logo, explicit currency/country/tax selection.
- Render two selectable templates (Classic and Modern).
- Supported logo files: PNG/JPEG/WebP/AVIF/PDF. PDF and unsupported native formats must be converted safely, with MIME sniffing, bounded size and dimensions and no script execution.
- Quote pricing must allow user-edited line items without leaking costing, margins or proprietary assumptions.
- Each quote has an immutable snapshot, signed token, expiry and one-time order fulfilment.

## Payment release requirements
1. Confirm a provider supports dynamic customer-specific checkout and a trustworthy verified callback/API.
2. Never release final PDF based solely on browser return URL, query string or localStorage.
3. Webhook signed verification, idempotent processing, exact €3 amount/currency/order verification.
4. Retry-safe PDF delivery with accessible error recovery and refunds where delivery fails.
5. Protect customer data with retention limits and privacy notice, redact logs and secure rate limits.
6. Test declined/cancelled/duplicate/replayed payments and tampered quote amounts.
7. Operator validation of payment settings is required before charging real customers.

## Coverage
- All live factory and generated niche pages, plus legacy dog grooming page.
- A single universal quote link/module for future niches.
- Cross-browser testing: iPhone/Safari, Android/Chrome, desktop and keyboard navigation.
- Quote snapshot: price before tax, tax, total, country, currency, description and client details.
- Do not make country imply VAT registration. No exposure of internal cost/margin.
- Regression suite covers money arithmetic, rounding, zero VAT, non-VAT, changed inputs and oversized/malformed logos.

## Commercial
- Preserve €24.99 Payhip toolkits and existing free lead magnets.
- Quote funnel event names: quote_builder_opened, quote_preview_updated, quote_checkout_started, quote_payment_verified, quote_pdf_delivered, quote_fulfilment_failed.
- Distinguish €3 paid quote purchase from €24.99 toolkit purchase in GA4 and Ads.
- No sitewide production deployment until all release gates pass.

## Current status
PR #31 is prototype-only. It does not include checkout or final PDF and must stay draft.

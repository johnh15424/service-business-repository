# Invoice generator development preview

Separate branch: feature/invoice-generator-preview. Based on PR #31 at 937d66e; no invoice implementation existed in that branch or main. Do not merge into production. The invoice draft PR targets the quotation development branch to keep the invoice diff separate.

## Implemented
- Business/customer name, address, optional contact and tax identifiers.
- Invoice number, real calendar date and due date (not before issue date).
- 1–40 service lines, positive quantities up to three decimals, currency-aware unit prices, rounded line amounts and authoritative totals.
- Explicit tax choice, editable rate/label; no country-implied tax. One rate on subtotal. Mixed/compound rates and statutory e-invoicing are outside this preview.
- Payment instructions, terms, optional logo through the existing validated local converter.
- Existing Classic and Modern PDF renderer, fonts, pagination and PNG validation. Clear INVOICE / BILL TO / due-date wording, never quotation validity language.
- Same-origin POST export, rate limit, bounded body, no-store responses, no database/file persistence, no analytics on the editor. No invoice payment processing or subscriptions.
- Editing invalidates exported PDF links. Async export refuses stale results if data changed while rendering.

## Isolation
The invoice development branch sets INVOICE_PREVIEW_ENABLED=true for its branch preview only; its root Worker config must not be merged/released. Both API and editor explicitly return 404 on the production custom domains and production workers.dev hostname even with the flag enabled. Without the flag, export returns 404. A separate invoice_preview environment targets service-business-repository-invoice-preview, with quote payments disabled and rate-limit namespace 3102. Root quotation payments remain disabled. No remote environment provisioned.

For local preview: npm ci; npm run preview:quotes; open /invoice-generator/ on port 8081. Local server uses real invoice rendering and no payment credentials.

## Evidence and outstanding gates
92 automated tests passed (85 quotation/calculator tests plus 7 invoice tests), including genuine PDF generation, decimal arithmetic, currency precision, bad dates/quantities, production guard, CSRF and throttling. Classic and Modern PDFs rendered with Poppler and visually reviewed. Long 40-item invoice pagination tested. These are not hosted browser/mobile tests.

Before release: hosted editor/export/logo tests, iPhone Safari and Android Chrome, long-content/logo visual QA and owner decision on access/commercial model. Do not describe the invoice as universally tax-compliant. No country-specific compliance claim is made.

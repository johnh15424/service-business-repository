# Conversion funnel and measurement

## Offers on every calculator

All 20 calculators render the same three-tier funnel from `public/assets/result-cta.js`. Product URLs and prices come only from `public/assets/niche-registry.js` (toolkits and checklists) and `public/assets/quote-model.js` (the quote price).

| Tier | What the visitor gets | Price | Where it appears |
| --- | --- | --- | --- |
| Free calculator | A price for one job | Free | The page itself |
| Professional Quote Generator | A professional PDF quotation for their customer, previewed free first | €4 once-off, EUR only | Hero (primary button) and directly under the recommended price |
| Pro Pricing Toolkit | Reusable workbooks for pricing jobs regularly | €24.99 once-off, through Payhip | Quiet hero link and a secondary offer under the quote offer |
| Free checklist | A pricing checklist through Payhip | Free | Quiet hero link and a light offer in the results |

A niche without a published checklist or toolkit (Dryer Vent Cleaning, Upholstery Cleaning and Mobile Tyre Service today) shows neither: there are no placeholders. The €4 offer is hidden until `/api/quotes/config` confirms checkout is ready, so it is never advertised on hosts that cannot take payment (branch previews, workers.dev).

## Events

Events reach GA4 (G-J3BBT6YZRB) through `site-analytics.js` under Google Consent Mode v2: denied by default, granted only after Accept. On any host other than servicepricingtools.com every gtag() call is held locally in `window.sptAnalyticsSuppressed` and nothing is sent.

| Event | Meaning | Counted |
| --- | --- | --- |
| `calculator_viewed` | Calculator loaded | Once per page view |
| `example_applied` | Visitor applied an example job (placement = job type) | Per click |
| `calculator_completed` | Visitor entered their own figures and has a valid price (or pressed calculate) | Once per page view |
| `free_checklist_clicked` | Click to a free checklist on Payhip (placement `hero` or `results-checklist`) | Per click. Not a download |
| `paid_cta_clicked` | Click to a €24.99 toolkit checkout on Payhip (placement `hero`, `results-toolkit`, `bottom`) | Per click. Not a sale |
| `quote_builder_opened` | Quote editor opened (placement `hero` or `results`) | Per open |
| `quote_preview_completed` | Free quote preview prepared | Per preview |
| `quote_checkout_started` | Server created the €4 PayPal order (value and currency as priced by the server) | Per checkout |
| `quote_payment_verified`, `purchase`, `paid_purchase` | Payment independently verified by the Worker against PayPal (amount, currency, merchant, capture) | Once per transaction, guarded on the device, never for €0, refunded or reversed orders |

`paid_purchase` is the single primary Google Ads purchase conversion. Click and preview events are engagement, never revenue.

## Known visibility gaps

- Payhip checklist downloads and toolkit sales are not reported to GA4: only clicks to Payhip are. Sales must be read from Payhip until an authorised Payhip order feed exists.
- Funnel events depend on consent mode: rejecting visitors send cookieless pings that GA4 models rather than counts.

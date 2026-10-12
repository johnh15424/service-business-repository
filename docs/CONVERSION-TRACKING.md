# Conversion tracking: current state, and what is not tracked

Audited 12 October 2026 against `main` (`00debb1`) and the live Worker deployed the same day.

## What reaches Google Ads

The Google Ads primary conversion action is **`servicepricingtools.com (web) paid_purchase`**. The
`servicepricingtools.com (web) …` prefix is how Google Ads names a conversion action imported from a
GA4 key event, so that action fires only when GA4 receives an event literally named `paid_purchase`.

Until this change, **no code path on the site ever emitted `paid_purchase`**, so the primary action
could not record a conversion regardless of how many sales completed. The paid download page now
sends `paid_purchase` alongside the GA4 ecommerce `purchase`, both carrying the same
`transaction_id`, so the two deduplicate and no second conversion action is needed.

## What is tracked

| Product | Price | Purchase tracked | How |
|---|---|---|---|
| Professional Quote Generator | €4 | Yes | `purchase` + `paid_purchase` on the download page, after the server confirms a verified PayPal capture |
| Pro Toolkits (Payhip) | €24.99 | **No** | See the blocker below |

The €4 signal is deliberately conservative. It is sent only when `GET /api/quotes/:id/status`
returns `status: "paid"` — a state only reached after `verifyPaidOrder()` has confirmed a completed
EUR capture, at the quote's recorded price, to the configured merchant. Consequently:

- a cancelled, failed, pending, refunded or reversed payment sends nothing;
- a €0 or free transaction sends nothing (`priceMinor > 0` is required);
- the value is the price actually recorded against that order (€4 now, €3 for historical orders),
  never a hardcoded constant;
- the event is sent once per transaction per device, guarded by `localStorage` with a
  `sessionStorage` fallback, so refreshes, revisits and retries cannot repeat the sale. The fallback
  matters: a `localStorage`-only guard throws and fails open in private browsing or with site data
  blocked, which re-sent the sale on every single reload.

Nothing identifying is sent. Events report `origin + pathname` with an empty referrer, so the bearer
token in the page fragment never reaches GA4, and no name, email, address, download URL or payment
credential is included. The quote id is present as `transaction_id` (`quote_<id>`) by design: it is
what reconciles a GA4 sale against a PayPal capture.

## Blocker: Payhip Pro Toolkit purchases (€24.99) are not tracked

Payhip hosts the entire €24.99 transaction. Checkout, payment and digital fulfilment all happen on
`payhip.com`; the only thing this repository controls is the outbound link and the
`paid_cta_clicked` event fired when a visitor taps it. **A CTA click is not a sale** and must never
be reported as one, so toolkit revenue is currently invisible to both GA4 and Google Ads.

Closing this gap requires configuration inside the Payhip account, which cannot be done from this
repository. There are two options, and neither is implemented here because a half-configured version
would report unpaid checkouts as revenue:

1. **Payhip's own Google Analytics setting** (simpler). Add the GA4 measurement ID `G-J3BBT6YZRB` in
   the Payhip account's analytics settings so Payhip fires `purchase` on its own receipt page. The
   cross-domain linker in `site-analytics.js` already lists `payhip.com`, so session attribution
   would survive the hop. Limitation: this depends on Payhip's implementation and on the buyer's
   consent state on Payhip's domain, neither of which is under our control.
2. **A Payhip webhook into a Worker route, forwarded to GA4 via the Measurement Protocol** (more
   reliable for revenue, weaker for ad attribution). This needs a Payhip webhook URL, a GA4
   Measurement Protocol API secret, and a way to carry the buyer's GA4 `client_id` through Payhip's
   checkout. Without that `client_id`, Google Ads cannot attribute the sale back to an ad click, so
   the conversion would appear in GA4 but still not in Ads.

Do not implement either halfway. A purchase event that fires on redirect, on a checkout click, or on
an unverified webhook is worse than no tracking, because it inflates conversions and will train Smart
Bidding on sales that never happened.

## Known limitation: consent and low ad volume

Consent Mode v2 starts every visitor with `analytics_storage` and all three advertising signals
denied, and `ads_data_redaction` is on. Only an explicit Accept grants them. This is intentional and
GDPR-correct, but it has a measurement consequence worth stating plainly: visitors who ignore or
reject the banner send only Google's cookieless pings, which do not produce attributed sessions in
standard reports.

Google fills that gap with conversion modelling, but modelling requires sustained daily ad-click
volume that this account is well below. **Until consent rates or ad volume rise, expect recorded
conversions to undercount real sales, even with the tracking working correctly.** The gap between
215 Google Ads clicks and 13 GA4 paid-search sessions over 1–12 October is consistent with this.

## Preview-domain traffic

`main` has no hostname guard, so `*.workers.dev`, Cloudflare branch previews and local `wrangler dev`
all report into the production GA4 property. Open PRs #38 and #51 address this; it is deliberately
not duplicated here to avoid conflicting with that work.

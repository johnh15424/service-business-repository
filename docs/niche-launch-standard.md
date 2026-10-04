# Service Pricing Tools niche launch standard

This is the production standard for every new commercial niche.

## Commercial hierarchy

Every niche has three offers in this order:

1. **Primary:** €24.99 Pricing Calculator & Profit Toolkit
2. **Secondary:** free pricing calculator
3. **Fallback:** free pricing checklist and MailerLite capture

The free checklist exists to recover visitors who are not ready to buy. It must not replace the paid toolkit as the main commercial CTA.

## Required registry entry

Add each niche once in `public/assets/niche-registry.js` with:

- `id`
- `name`
- `category`
- `status`
- `calculatorPath`
- `freeUrl`
- `proUrl`
- `proPrice`

Commercial links must come from the registry rather than being duplicated across generated pages.

## Calculator standard

New calculators should use the shared calculator runtime and show the commercial block immediately after the estimate/results.

The results hierarchy is:

- calculated result
- paid Pro Toolkit CTA
- reassurance that the calculator remains free
- free checklist fallback

Required events:

- `calculator_viewed`
- `calculator_completed`
- `paid_cta_clicked`
- `free_checklist_clicked`

## SEO guide standard

Supporting guides should include:

```html
<div data-commercial-funnel data-niche="NICHE_ID" data-placement="guide-top"></div>
<script type="module" src="/assets/commercial-funnel.js"></script>
```

The shared commercial funnel module automatically loads the correct toolkit URL, calculator URL, checklist URL and price from the registry.

A guide should remain useful editorial content. The paid toolkit is the main commercial CTA, the calculator is the secondary CTA and the free checklist is the fallback.

## Payhip standard

Each niche requires:

- one free checklist product
- one paid Pro Toolkit product at the current commercial price
- separate product cover images
- correct digital files

Free checklist products should add users to the corresponding niche-specific MailerLite group.

Paid toolkit buyers should not be sent through the free-checklist nurture sequence that later attempts to sell the same toolkit.

## MailerLite standard

Each niche requires one niche-specific group and one nurture automation:

- Email 1 immediately
- 3-day delay
- Email 2
- 5-day delay
- Email 3

Email 1 delivers useful value and points back to the calculator.
Email 2 highlights a niche-specific pricing problem.
Email 3 promotes the paid toolkit.

## Production QA

Before a niche is marked live:

- calculator works on mobile and desktop
- no horizontal overflow
- tax/currency controls work
- calculator results are valid
- registry URLs are correct
- paid CTA opens the correct Payhip toolkit
- free checklist opens the correct Payhip product
- free product adds the subscriber to the correct MailerLite group
- nurture automation is active
- all email links are correct
- niche is included in the calculator directory
- niche is included in the sitemap
- at least one supporting SEO page is planned or live
- embed mode works where supported

## Scale rule

Do not hand-code commercial CTA copy or URLs for each new niche unless a niche genuinely needs an exception. Add the niche to the registry and use the shared components. This is the basis for scaling from 10 niches to 30, 50 and 100+ niches without multiplying maintenance work.

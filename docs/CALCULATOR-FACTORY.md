# Service Pricing Tools Calculator Factory

## Objective

Scale from a handful of bespoke calculators to 100+ niche-specific commercial funnels without turning every niche into a separate software project.

The factory must preserve two things at the same time:

1. shared economics, localisation, tracking and page structure
2. genuinely niche-specific inputs, terminology, examples and products

A new calculator should become a configuration and QA task rather than a ground-up build.

## Existing reusable assets

- `public/assets/global-locales.js` — shared country and display-currency layer
- `public/assets/pricing-engine.js` — generic service-business pricing economics
- `public/assets/niche-registry.js` — live niche/product registry
- `public/assets/styles.css` — shared visual system
- Payhip pattern — free checklist + €24.99 Pro toolkit
- MailerLite pattern — niche group + immediate email + 3-day lesson + 5-day Pro email
- IndexNow workflow — submits changed public pages

The four original calculators remain live during the migration. Do not rewrite them simply to make the code look uniform.

## Niche config contract

Every future niche config should define:

- id
- name
- category
- slug
- SEO title and description
- headline and explanatory copy
- job/service types
- realistic example values
- direct-cost fields
- shared defaults
- free Payhip URL
- Pro Payhip URL
- Pro price

Config must not contain fabricated legal, tax, wage or utility claims. Country currency can be loaded from the shared localisation layer. Tax remains off unless the user enables it.

## Shared pricing contract

Each niche adapter converts its fields into:

- `labourCost`
- `directCosts`
- `travelCost`
- `allocatedOverhead`
- `fixedFee`
- `paymentFeeRate`
- `reserveRate`
- `targetMargin`
- `minimumPreTax`
- `taxRate`
- `chargeTax`

`calculateServicePrice()` then returns recommended pre-tax price, tax, total, payment fees, reserve, retained profit and retained margin.

Niche-specific maths that does not fit this model should be calculated before calling the shared engine. Examples include square-metre productivity, crew multipliers, vehicle-size adjustments or coat-condition time.

## Production pipeline

For every new niche:

1. Research real job structure and terminology.
2. Define niche config and examples.
3. Generate calculator page and adapter.
4. Run numerical and browser QA.
5. Generate free checklist PDF.
6. Generate Pro XLSX, Quick Start PDF and ZIP.
7. Create MailerLite group and 3-email automation.
8. Create free and €24.99 Payhip products.
9. Insert Payhip URLs into config/registry.
10. Publish calculator.
11. Add directory/category placement and sitemap entry.
12. Run one free-download consent test where practical.
13. Start niche-specific outreach and SEO content.

## Quality gate

A niche cannot be marked `live` until:

- result calculation works with zero and normal values
- denominator/margin guard works
- minimum charge works
- tax is editable and off by default
- country/currency selector works
- mobile result navigation works
- Apply Example changes visible fields
- free CTA points to the correct free product
- paid CTA points to the correct paid product
- conversion hooks identify the correct niche
- page has unique title, description and niche copy
- examples use the correct service terminology
- sitemap and directory include the page

## Scale plan

Pilot the factory with calculators 5–10:

5. Lawn Care
6. Window Cleaning
7. Carpet Cleaning
8. Handyman
9. Painting & Decorating
10. Gutter Cleaning

If those six can share the engine/template while remaining useful and distinct, expand in batches:

- 10 → 25
- 25 → 50
- 50 → 100

At 25+ niches, homepage discovery should shift toward category pages rather than an ever-growing flat card list.

## Commercial metric

The factory exists to create a broad portfolio of small revenue streams. Track per niche:

- calculator views
- calculator completions
- free checklist clicks/downloads
- paid CTA clicks
- sales
- revenue per 100 calculator visitors

Scale depth and supporting SEO content around niches that demonstrate traffic or purchase intent. Do not remove low-volume calculators merely because they are individually small; long-tail aggregate revenue is part of the model.

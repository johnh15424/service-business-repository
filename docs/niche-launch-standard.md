# Service Pricing Tools niche launch standard

This is the production standard for every new commercial niche.

## Commercial hierarchy

Every niche has three offers in this order:

1. **Primary:** €24.99 Pricing Calculator & Profit Toolkit
2. **Secondary:** free pricing calculator
3. **Fallback:** free pricing checklist and MailerLite capture

The free checklist exists to recover visitors who are not ready to buy. It must not replace the paid toolkit as the main commercial CTA.

The paid-first hierarchy is a platform rule. New calculator templates, factory runtimes and supporting pages must inherit it automatically. Do not introduce a new niche with the free checklist above the paid toolkit.

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

Commercial links must come from the registry rather than being duplicated across generated pages wherever the shared runtime supports it.

## Calculator standard

New calculators should use the shared factory calculator runtime and show the commercial block immediately after the estimate/results.

The results hierarchy is:

- calculated result
- paid Pro Toolkit CTA
- concise explanation of what the toolkit adds
- reassurance that the calculator remains free
- free checklist fallback

The paid CTA must be visually primary and must appear before the free checklist CTA in the DOM as well as on screen.

Required events:

- `calculator_viewed`
- `calculator_completed`
- `paid_cta_clicked`
- `free_checklist_clicked`

Where a legacy calculator uses a niche-specific runtime, it must still follow the same commercial order.

## Cost-intent SEO standard

Every niche should launch with **two strong cost-intent guides** in addition to the calculator. The purpose is to capture searchers who are actively trying to price the service, then move qualified service-business traffic into the calculator and paid toolkit.

Cost guides are not consumer price-comparison pages. The visible introduction should make the intended audience explicit, for example:

> This guide is for [service] businesses setting profitable prices, not customers comparing local quotes.

This reduces irrelevant consumer intent while preserving valuable cost and pricing keywords.

### Content quality

Each guide must contain substantial, niche-specific editorial value. Do not publish thin programmatic pages, generic filler or lightly reworded copies of another niche.

A strong cost guide should normally cover the parts that genuinely matter for that service, such as:

- the economic driver of the job: labour, crew-hours, productive minutes or site productivity
- service-specific direct costs
- setup, travel and mobilisation
- equipment wear or specialist access
- minimum charges where relevant
- fixed-price versus hourly or unit-rate decisions
- scope uncertainty and exclusions
- recurring-work economics where relevant
- common underpricing mistakes
- a practical costing sequence
- links to the matching calculator and closely related guide

There is no fixed word-count target. Publish enough original material to answer the contractor's pricing problem properly. As a practical quality check, most primary cost guides should contain roughly 700 to 1,200 useful words rather than short templated summaries.

Never invent national average prices, wage rates, productivity claims, tax rates or market benchmarks just to make a page look authoritative. Use methodology and editable business inputs unless a factual number has been reviewed and sourced appropriately.

### Search intent and metadata

Each page requires:

- one clear primary cost/pricing query
- a unique title tag written for that query and the service-business audience
- a unique meta description explaining the business-pricing value
- one canonical URL
- one H1 matching the specific intent without mechanically copying the title tag
- descriptive H2/H3 structure that can be crawled without JavaScript
- static HTML body copy
- internal links to the calculator, sibling cost guide and relevant supporting content
- visible wording that identifies the intended audience as service providers / contractors / business owners

Prefer titles such as `Commercial Pressure Washing Cost | Contractor Pricing Guide` rather than consumer-oriented titles that imply a local quote directory.

### Structured data

Cost guides should include static `Article` structured data with:

- headline
- description
- dateModified
- Service Pricing Tools as author/publisher
- `BusinessAudience` describing the relevant service-business operator
- `mainEntityOfPage`

Breadcrumb structured data is recommended where useful. Structured data must describe visible page content and must not be used to manufacture claims that are not present on the page.

### Commercial placement

Supporting guides should render the reusable commercial funnel near the top and again after the useful editorial content:

```html
<div data-commercial-funnel data-niche="NICHE_ID" data-placement="cost-guide-top"></div>
...
<div data-commercial-funnel data-niche="NICHE_ID" data-placement="cost-guide-bottom"></div>
<script type="module" src="/assets/commercial-funnel.js"></script>
```

The shared commercial funnel module loads the correct toolkit URL, calculator URL, checklist URL and price from the registry.

The commercial hierarchy on SEO pages remains:

1. paid Pro Toolkit
2. free calculator
3. free checklist fallback

The editorial page must still answer the searcher's question without requiring a purchase. The toolkit is the logical next step, not a replacement for useful content.

## Internal discovery and indexing

For every niche:

- calculator URL must be linked from `/calculators/`
- cost-intent pages must be linked from `/cost-guides/`
- all canonical calculator and guide URLs must be in `sitemap.xml`
- related guides within the same niche should cross-link naturally
- important pages must be reachable through ordinary HTML links, not JavaScript-only navigation

Do not create orphan SEO pages.

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
- paid toolkit appears before the free checklist after calculator results
- registry URLs are correct
- paid CTA opens the correct Payhip toolkit
- free checklist opens the correct Payhip product
- free product adds the subscriber to the correct MailerLite group
- nurture automation is active
- all email links are correct
- niche is included in the calculator directory
- niche has two cost-intent pages or a documented reason for a different content structure
- SEO pages have unique title, description, H1 and substantive niche-specific copy
- SEO pages make the service-business audience explicit
- SEO pages are static/crawlable and internally linked
- niche is included in the sitemap
- embed mode works where supported

## Scale rule

Do not hand-code commercial CTA copy or URLs for each new niche unless a niche genuinely needs an exception. Add the niche to the registry and use the shared components.

Do not scale thin content. The factory should automate structure, links, metadata scaffolding, tracking and QA. The niche-specific commercial reasoning and SEO copy must still reflect the actual economics of that service.

This is the basis for scaling from 10 niches to 30, 50 and 100+ niches without multiplying maintenance work or diluting search quality.

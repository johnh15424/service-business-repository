# Dog Grooming conversion hooks

The live product URL is https://payhip.com/b/7pXUm. Both result and bottom CTAs use this exact URL. Price: EUR 24.99.

No analytics provider was present. The application now pushes events to window.dataLayer and dispatches a window CustomEvent named calculator:conversion. These are integration hooks only, not a hosted reporting service. No cookies, persistent identifiers, entered costs, quote amounts or personal information are collected or transmitted by these hooks.

- calculator_viewed: once when the calculator module initialises.
- calculator_completed: once per page load after a valid estimate is requested through the form submit button or mobile estimate shortcut. Merely displaying example defaults does not count.
- paid_cta_clicked: each paid link activation, with placement results or bottom.

Every event carries calculator: dog_grooming. Hook failures cannot stop navigation or calculation. A future analytics integration should consume these events with appropriate consent and privacy treatment. Purchase confirmation requires Payhip/payment-provider reporting; a CTA click is not a sale.

Payhip listing and ZIP were published 30 September 2026. Payment-provider connection remained pending at publication. Do not claim a successful paid purchase or end-to-end delivery test until checkout is enabled and tested.

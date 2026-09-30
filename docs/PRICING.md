# Pricing decisions and workbook compatibility

Inputs use percent values in 0–100 and times in minutes. The pure engine rejects negative, non-finite, out-of-range and infeasible combinations. It does not silently clamp user values.

## Core formula

Loaded hourly labour = wage × (1 + payroll burden).
Grooming labour = total grooming person-minutes / 60 × loaded hourly labour × optional labour intensity.
Travel labour = travel minutes / 60 × loaded hourly labour, only in mobile mode.
Direct costs = grooming labour + travel labour + consumables + wear + utilities + vehicle cost.
Core cost C = direct costs + monthly overhead / paid appointments + fixed transaction fee.

If fees are charged on the full customer total, effective percentage fee F = f × (1+t). Otherwise F = f.
Required pre-tax price P = C / (1 − target margin − contingency − F).
Recommended P = max(required P, minimum), rounded upwards to the selected currency’s minor unit.
Tax = P × t, rounded to the nearest currency minor unit. Customer total = P + tax.
Variable payment fee = selected basis × fee rate; estimate retains sub-cent fee precision.

Accounting gross profit = P − direct costs.
Planning surplus = gross profit − overhead − fixed fee − variable fee − contingency.
The user-facing target is conservatively applied after all these costs. Both gross margin and retained margin are displayed with explicit labels. This avoids representing a fully allocated surplus as accounting gross profit.

Payment provider settlement rounding can differ by cents. No-show contingency is a revenue reserve, not a stochastic loss-rate model. Currency formatting and rounding follow ISO currency precision (including zero-decimal JPY and three-decimal KWD). A rounded-tax fee correction protects the target from small rounding shortfalls. Quotes above one billion currency units are rejected, and unusually large appointment prices receive a warning.

## Workbook v1

Original medium full-groom example: 105 base minutes + 15 extra minutes; wage 18, burden 12%, complexity 1.1; consumables 6.5, wear 3, utilities 2.5, overhead 2200 / 120, fixed fee .3, variable fee 2%, reserve 3%, margin 40%, minimum 70, no tax.
Core cost: 74.98533333333334. Continuous pre-tax result: 136.33696969696973.
Web output with those settings: 136.34 after upward cent rounding. This is covered by a regression test.

Intentional web differences:
- Optional labour intensity defaults to 1, so explicit extra time is not also multiplied without the user's choice.
- Grooming intensity does not multiply travel labour.
- Percentage fees default to the tax-inclusive customer total.
- Reserve is separate from retained profit. Workbook v1 includes reserve in its displayed profit (43% in its default case).
- Gross profit before overhead is distinct from surplus after all entered costs.
- Coat and size selections suggest examples only when Apply example is pressed; selections never silently overwrite entered cost assumptions.
- Product splits sum back to the service example's consumables cost.

The workbook has not been modified. The static toolkit CTA links to compatibility notes, with purchase access unavailable. A future workbook release should share these tests and definitions.

## Tax references checked 2026-09-30

- Ireland Revenue dog grooming classification: https://www.revenue.ie/en/vat/vat-rates/search-vat-rates/D/dog-grooming.aspx
- Ireland current standard rate 23%: https://www.revenue.ie/en/vat/vat-rates/search-vat-rates/current-vat-rates.aspx
- UK 20%: https://www.gov.uk/vat-rates
- Australia 10%, ATO search-indexed official reference: https://www.ato.gov.au/businesses-and-organisations/international-tax-for-business/in-detail/trans-tasman-rules/comparing-the-new-zealand-and-australian-tax-system/goods-and-services-tax
- Canada GST/HST 5/13/14/15%: https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-place-supply.html
- US/custom: no factual automatic rate; manual user entry.

Canada profiles do not automatically include PST/QST. Warnings require checking applicability and combining rates where appropriate. The engine supports one rate on the pre-tax base, not multiple taxable bases or compound taxes.

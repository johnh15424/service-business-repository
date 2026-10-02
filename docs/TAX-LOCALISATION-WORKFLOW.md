# Tax localisation workflow

Tax localisation is part of the calculator factory and must be reviewed before a niche is considered production-ready.

## UX rules

1. Country selection should load the matching currency automatically.
2. Where a reviewed tax profile exists, show a suggested VAT, GST or sales-tax reference rate.
3. Keep the suggested rate editable.
4. Do not automatically turn tax on solely because a country was selected.
5. The user must confirm that they charge tax before it is added to the customer total.
6. Show a short note explaining that registration thresholds, local taxes and service-specific reduced rates may change the final treatment.
7. For jurisdictions with regional tax, such as Canada or the United States, require regional input or leave the rate manual unless a reliable regional profile exists.
8. Service-specific reviewed profiles override generic country defaults.

## Data model

Each country profile should support:

- country code
- currency
- tax label
- suggested rate
- confidence level
- source
- source URL
- reviewed date
- regional requirement
- service-specific overrides

## Confidence levels

- `service-specific`: authoritative source reviewed for this exact service category.
- `standard-reference`: authoritative standard national VAT or GST reference rate, but service-specific treatment may differ.
- `regional-required`: national reference exists but regional tax can change the charge.
- `manual-tax`: no safe automatic rate. Keep the field editable and explain why.

## Publishing gate for each niche

Before publishing a new calculator:

1. Review the highest-priority markets for that niche.
2. Add service-specific overrides where an authoritative source clearly supports them.
3. Confirm the calculator displays the suggested rate when the country changes.
4. Confirm `Charge tax?` remains off by default.
5. Turn tax on and verify that the total, payment-fee calculation and retained profit remain correct.
6. Verify any province, state or regional selector where required.
7. Record the review date and source.

## Global expansion

Do not invent rates to achieve nominal worldwide coverage. Expand reviewed tax profiles in batches using authoritative tax authorities or reliable current indirect-tax references. Unreviewed countries remain usable through the manual editable tax field.

The long-term target is full supported-country coverage plus service-specific overrides for the main markets and niches.

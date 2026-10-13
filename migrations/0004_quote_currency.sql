-- Currency (ISO 4217) of the PayPal order created for a quote, recorded alongside price_minor when the
-- order is created. NULL marks orders created before international checkout existed; those were all EUR
-- and keep verifying as EUR. The customer pays in this currency; the currency printed on the quotation
-- document is separate and lives in quote_json.
ALTER TABLE quotes ADD COLUMN price_currency TEXT;

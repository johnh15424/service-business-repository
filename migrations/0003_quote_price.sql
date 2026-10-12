-- Price (minor units, EUR) of the PayPal order created for a quote. NULL marks orders created before prices
-- were recorded, which were all EUR 3.00 and keep verifying at that amount.
ALTER TABLE quotes ADD COLUMN price_minor INTEGER;

-- Delivery email for paid quotations. The address is deleted with the quote row at expiry (7 days).
ALTER TABLE quotes ADD COLUMN delivery_email TEXT;
ALTER TABLE quotes ADD COLUMN email_status TEXT;
ALTER TABLE quotes ADD COLUMN email_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE quotes ADD COLUMN email_next_at INTEGER;
ALTER TABLE quotes ADD COLUMN email_sent_at INTEGER;
ALTER TABLE quotes ADD COLUMN email_token_hash TEXT;

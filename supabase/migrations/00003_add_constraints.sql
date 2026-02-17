-- Add unique constraints needed for .single() calls and upserts
ALTER TABLE customers ADD CONSTRAINT customers_user_id_unique UNIQUE (user_id);
ALTER TABLE customers ADD CONSTRAINT customers_email_unique UNIQUE (email);
ALTER TABLE farm_profiles ADD CONSTRAINT farm_profiles_customer_id_unique UNIQUE (customer_id);

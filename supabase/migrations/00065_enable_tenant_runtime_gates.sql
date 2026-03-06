-- Enable tenant runtime read and write gates by default for all customers.
-- Previously seeded as false (00036) which blocks all tenant API operations
-- unless a per-customer override exists in customer_feature_flags.

UPDATE feature_flags
SET default_enabled = true,
    updated_at = now()
WHERE flag_key IN ('tenant.runtime.reads', 'tenant.runtime.writes');

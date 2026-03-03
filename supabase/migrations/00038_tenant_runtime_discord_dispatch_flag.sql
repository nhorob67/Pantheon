-- Phase 3: gate real Discord dispatch worker path behind explicit customer feature flag.

INSERT INTO feature_flags (
  flag_key,
  description,
  default_enabled,
  owner
)
VALUES (
  'tenant.runtime.discord_dispatch',
  'Enables real Discord API dispatch for tenant runtime canary worker path.',
  false,
  'runtime'
)
ON CONFLICT (flag_key) DO NOTHING;

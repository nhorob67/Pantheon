-- Restore the invariant that each customer has at most one active managed
-- team email identity. Agent-scoped identities remain one-per-agent.

WITH ranked_team_identities AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY customer_id
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS row_num
  FROM email_identities
  WHERE is_active = true
    AND identity_type = 'team'
    AND agent_id IS NULL
)
UPDATE email_identities ei
SET
  is_active = false,
  updated_at = now()
FROM ranked_team_identities ranked
WHERE ei.id = ranked.id
  AND ranked.row_num > 1;

CREATE UNIQUE INDEX IF NOT EXISTS email_identities_active_team_customer_unique
  ON email_identities(customer_id)
  WHERE is_active = true
    AND identity_type = 'team'
    AND agent_id IS NULL;

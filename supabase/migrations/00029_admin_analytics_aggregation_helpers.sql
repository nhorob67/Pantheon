-- Admin analytics aggregation helpers
-- Moves high-cardinality rollups from application code into SQL.

CREATE OR REPLACE FUNCTION admin_fleet_health_counts()
RETURNS TABLE (
  total BIGINT,
  running BIGINT,
  stopped BIGINT,
  errored BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    count(*)::BIGINT AS total,
    count(*) FILTER (WHERE status = 'running')::BIGINT AS running,
    count(*) FILTER (WHERE status = 'stopped')::BIGINT AS stopped,
    count(*) FILTER (WHERE status = 'error')::BIGINT AS errored
  FROM instances;
$$;

CREATE OR REPLACE FUNCTION admin_fleet_stale_instances(p_stale_before TIMESTAMPTZ)
RETURNS TABLE (
  id UUID,
  customer_email TEXT,
  last_health_check TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id,
    c.email AS customer_email,
    i.last_health_check
  FROM instances i
  LEFT JOIN customers c ON c.id = i.customer_id
  WHERE i.status = 'running'
    AND (i.last_health_check IS NULL OR i.last_health_check < p_stale_before)
  ORDER BY i.last_health_check ASC NULLS FIRST;
$$;

CREATE OR REPLACE FUNCTION admin_fleet_version_breakdown()
RETURNS TABLE (
  version TEXT,
  count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(NULLIF(i.openclaw_version, ''), 'unknown') AS version,
    count(*)::BIGINT AS count
  FROM instances i
  GROUP BY COALESCE(NULLIF(i.openclaw_version, ''), 'unknown')
  ORDER BY count DESC, version ASC;
$$;

CREATE OR REPLACE FUNCTION admin_revenue_breakdown_counts()
RETURNS TABLE (
  total_customers BIGINT,
  active BIGINT,
  past_due BIGINT,
  canceled BIGINT,
  incomplete BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    count(*)::BIGINT AS total_customers,
    count(*) FILTER (WHERE subscription_status = 'active')::BIGINT AS active,
    count(*) FILTER (WHERE subscription_status = 'past_due')::BIGINT AS past_due,
    count(*) FILTER (WHERE subscription_status = 'canceled')::BIGINT AS canceled,
    count(*) FILTER (WHERE subscription_status = 'incomplete')::BIGINT AS incomplete
  FROM customers;
$$;

CREATE OR REPLACE FUNCTION admin_usage_daily_30d(p_start_date DATE)
RETURNS TABLE (
  date DATE,
  cost_cents BIGINT,
  input_tokens BIGINT,
  output_tokens BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    au.date,
    COALESCE(sum(au.estimated_cost_cents), 0)::BIGINT AS cost_cents,
    COALESCE(sum(au.input_tokens), 0)::BIGINT AS input_tokens,
    COALESCE(sum(au.output_tokens), 0)::BIGINT AS output_tokens
  FROM api_usage au
  WHERE au.date >= p_start_date
  GROUP BY au.date
  ORDER BY au.date ASC;
$$;

CREATE OR REPLACE FUNCTION admin_usage_top_consumers_30d(
  p_start_date DATE,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  customer_id UUID,
  email TEXT,
  total_cost_cents BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    au.customer_id,
    c.email,
    COALESCE(sum(au.estimated_cost_cents), 0)::BIGINT AS total_cost_cents
  FROM api_usage au
  LEFT JOIN customers c ON c.id = au.customer_id
  WHERE au.date >= p_start_date
  GROUP BY au.customer_id, c.email
  ORDER BY total_cost_cents DESC, au.customer_id ASC
  LIMIT GREATEST(COALESCE(p_limit, 10), 1);
$$;

CREATE OR REPLACE FUNCTION admin_conversation_summary_30d(p_start_date DATE)
RETURNS TABLE (
  total_messages_30d BIGINT,
  total_conversations_30d BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(sum(ce.message_count), 0)::BIGINT AS total_messages_30d,
    COALESCE(sum(ce.conversation_count), 0)::BIGINT AS total_conversations_30d
  FROM conversation_events ce
  WHERE ce.date >= p_start_date;
$$;

CREATE OR REPLACE FUNCTION admin_conversation_daily_messages_30d(p_start_date DATE)
RETURNS TABLE (
  date DATE,
  count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ce.date,
    COALESCE(sum(ce.message_count), 0)::BIGINT AS count
  FROM conversation_events ce
  WHERE ce.date >= p_start_date
  GROUP BY ce.date
  ORDER BY ce.date ASC;
$$;

CREATE OR REPLACE FUNCTION admin_customers_approaching_limits(
  p_start_date DATE,
  p_min_percentage INTEGER DEFAULT 50
)
RETURNS TABLE (
  customer_id UUID,
  email TEXT,
  spending_cap_cents INTEGER,
  current_cents BIGINT,
  percentage INTEGER,
  auto_pause BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH monthly_usage AS (
    SELECT
      au.customer_id,
      COALESCE(sum(au.estimated_cost_cents), 0)::BIGINT AS current_cents
    FROM api_usage au
    WHERE au.date >= p_start_date
    GROUP BY au.customer_id
  ),
  scored AS (
    SELECT
      c.id AS customer_id,
      c.email,
      c.spending_cap_cents,
      COALESCE(mu.current_cents, 0)::BIGINT AS current_cents,
      CASE
        WHEN c.spending_cap_cents > 0
          THEN round((COALESCE(mu.current_cents, 0)::NUMERIC / c.spending_cap_cents::NUMERIC) * 100)::INTEGER
        ELSE 0
      END AS percentage,
      COALESCE(c.spending_cap_auto_pause, false) AS auto_pause
    FROM customers c
    LEFT JOIN monthly_usage mu ON mu.customer_id = c.id
    WHERE c.spending_cap_cents IS NOT NULL
  )
  SELECT
    scored.customer_id,
    scored.email,
    scored.spending_cap_cents,
    scored.current_cents,
    scored.percentage,
    scored.auto_pause
  FROM scored
  WHERE scored.percentage >= GREATEST(COALESCE(p_min_percentage, 0), 0)
  ORDER BY scored.percentage DESC, scored.customer_id ASC;
$$;

CREATE OR REPLACE FUNCTION customer_monthly_spending_snapshot(
  p_start_date DATE,
  p_today DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  customer_id UUID,
  total_cost_cents BIGINT,
  today_cost_cents BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    au.customer_id,
    COALESCE(sum(au.estimated_cost_cents), 0)::BIGINT AS total_cost_cents,
    COALESCE(sum(
      CASE
        WHEN au.date = p_today THEN au.estimated_cost_cents
        ELSE 0
      END
    ), 0)::BIGINT AS today_cost_cents
  FROM api_usage au
  WHERE au.date >= p_start_date
  GROUP BY au.customer_id;
$$;

REVOKE ALL ON FUNCTION admin_fleet_health_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_fleet_health_counts() TO service_role;

REVOKE ALL ON FUNCTION admin_fleet_stale_instances(TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_fleet_stale_instances(TIMESTAMPTZ) TO service_role;

REVOKE ALL ON FUNCTION admin_fleet_version_breakdown() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_fleet_version_breakdown() TO service_role;

REVOKE ALL ON FUNCTION admin_revenue_breakdown_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_revenue_breakdown_counts() TO service_role;

REVOKE ALL ON FUNCTION admin_usage_daily_30d(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_usage_daily_30d(DATE) TO service_role;

REVOKE ALL ON FUNCTION admin_usage_top_consumers_30d(DATE, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_usage_top_consumers_30d(DATE, INTEGER) TO service_role;

REVOKE ALL ON FUNCTION admin_conversation_summary_30d(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_conversation_summary_30d(DATE) TO service_role;

REVOKE ALL ON FUNCTION admin_conversation_daily_messages_30d(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_conversation_daily_messages_30d(DATE) TO service_role;

REVOKE ALL ON FUNCTION admin_customers_approaching_limits(DATE, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_customers_approaching_limits(DATE, INTEGER) TO service_role;

REVOKE ALL ON FUNCTION customer_monthly_spending_snapshot(DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION customer_monthly_spending_snapshot(DATE, DATE) TO service_role;

CREATE OR REPLACE FUNCTION get_session_stats(p_session_ids uuid[])
RETURNS TABLE(
  session_id uuid,
  message_count bigint,
  last_content text,
  last_direction text
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    m.session_id,
    count(*)::bigint AS message_count,
    (array_agg(m.content ORDER BY m.created_at DESC))[1],
    (array_agg(m.direction ORDER BY m.created_at DESC))[1]
  FROM tenant_messages m
  WHERE m.session_id = ANY(p_session_ids)
  GROUP BY m.session_id;
$$;

-- RLS policy rewrite: use (select auth.uid()) for initplan caching.
DO $$
DECLARE
  p RECORD;
  new_qual TEXT;
  new_with_check TEXT;
  using_clause TEXT;
  with_check_clause TEXT;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        COALESCE(qual, '') ~* 'auth\.uid\(\)'
        OR COALESCE(with_check, '') ~* 'auth\.uid\(\)'
      )
  LOOP
    new_qual := p.qual;
    new_with_check := p.with_check;

    IF new_qual IS NOT NULL THEN
      new_qual := regexp_replace(
        new_qual,
        '\(\s*select\s+auth\.uid\(\)\s*\)',
        '__farmclaw_auth_uid_token__',
        'gi'
      );
      new_qual := regexp_replace(
        new_qual,
        'auth\.uid\(\)',
        '(select auth.uid())',
        'gi'
      );
      new_qual := replace(
        new_qual,
        '__farmclaw_auth_uid_token__',
        '(select auth.uid())'
      );
    END IF;

    IF new_with_check IS NOT NULL THEN
      new_with_check := regexp_replace(
        new_with_check,
        '\(\s*select\s+auth\.uid\(\)\s*\)',
        '__farmclaw_auth_uid_token__',
        'gi'
      );
      new_with_check := regexp_replace(
        new_with_check,
        'auth\.uid\(\)',
        '(select auth.uid())',
        'gi'
      );
      new_with_check := replace(
        new_with_check,
        '__farmclaw_auth_uid_token__',
        '(select auth.uid())'
      );
    END IF;

    IF new_qual IS DISTINCT FROM p.qual
       OR new_with_check IS DISTINCT FROM p.with_check THEN
      using_clause := CASE
        WHEN new_qual IS NOT NULL THEN format(' USING (%s)', new_qual)
        ELSE ''
      END;

      with_check_clause := CASE
        WHEN new_with_check IS NOT NULL THEN format(' WITH CHECK (%s)', new_with_check)
        ELSE ''
      END;

      EXECUTE format(
        'ALTER POLICY %I ON %I.%I%s%s',
        p.policyname,
        p.schemaname,
        p.tablename,
        using_clause,
        with_check_clause
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Composio instance lookup index.
CREATE INDEX IF NOT EXISTS idx_composio_configs_instance_id
  ON public.composio_configs(instance_id)
  WHERE instance_id IS NOT NULL;

-- Knowledge file list index for non-archived newest-first reads.
CREATE INDEX IF NOT EXISTS idx_knowledge_files_instance_non_archived_created
  ON public.knowledge_files(instance_id, created_at DESC)
  WHERE status <> 'archived';

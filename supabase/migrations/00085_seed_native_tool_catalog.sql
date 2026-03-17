-- Migration: Seed native tool catalog for all existing tenants
--
-- Phase 1.1 of the SMB Agent Runtime Excellence Plan.
-- Registers all native tools (memory, schedule, self-config, credentials, network)
-- in tenant_tools + tenant_tool_policies so they are visible to the unified
-- policy/audit system.
--
-- Canonical source of truth: src/lib/runtime/tool-catalog.ts
-- This migration is a point-in-time snapshot. New tenants are seeded via
-- ensureNativeToolCatalog() at runtime.

-- Step 1: Insert native tools for every active tenant
WITH tenant_list AS (
  SELECT id AS tenant_id, customer_id
  FROM tenants
  WHERE status = 'active'
),
tool_defs (tool_key, display_name, description, status, risk_level, category) AS (
  VALUES
    -- Memory
    ('memory_write',              'Memory Write',           'Save a fact, preference, or commitment to long-term memory',                     'enabled',  'medium',   'memory'),
    ('memory_search',             'Memory Search',          'Search long-term memory for previously saved facts, preferences, and commitments','enabled',  'low',      'memory'),
    ('memory_read',               'Memory Read',            'Fetch a specific memory record by ID',                                           'enabled',  'low',      'memory'),
    -- Schedules
    ('schedule_create',           'Schedule Create',        'Create a recurring scheduled task with a cron expression',                        'enabled',  'medium',   'schedule'),
    ('schedule_list',             'Schedule List',          'List all active schedules for this team',                                         'enabled',  'low',      'schedule'),
    ('schedule_toggle',           'Schedule Toggle',        'Enable or disable a schedule by its ID',                                         'enabled',  'medium',   'schedule'),
    ('schedule_delete',           'Schedule Delete',        'Delete a custom schedule by its ID',                                             'enabled',  'high',     'schedule'),
    -- Self-config (read-only)
    ('config_view_my_config',     'View My Config',         'View the current agent''s configuration',                                        'enabled',  'low',      'self-config'),
    ('config_list_agents',        'List Agents',            'List all active agents on this team',                                             'enabled',  'low',      'self-config'),
    -- Self-config (identity mutations)
    ('config_set_my_goal',        'Set My Goal',            'Set a goal for this agent',                                                      'enabled',  'medium',   'self-config'),
    ('config_set_my_role',        'Set My Role',            'Set this agent''s role',                                                          'enabled',  'medium',   'self-config'),
    ('config_set_my_backstory',   'Set My Backstory',       'Set context/backstory for this agent',                                           'enabled',  'medium',   'self-config'),
    ('config_set_display_name',   'Set Display Name',       'Change this agent''s display name',                                               'enabled',  'medium',   'self-config'),
    ('config_toggle_skill',       'Toggle Skill',           'Add or remove a custom skill from this agent',                                   'enabled',  'medium',   'self-config'),
    -- Self-config (capability mutations)
    ('config_set_my_autonomy',    'Set My Autonomy',        'Set this agent''s autonomy level',                                                'enabled',  'high',     'self-config'),
    ('config_set_my_delegation',  'Set My Delegation',      'Control whether this agent can delegate and receive delegated tasks',             'enabled',  'high',     'self-config'),
    ('config_update_team_profile','Update Team Profile',    'Update team profile fields (team-wide impact)',                                   'enabled',  'high',     'self-config'),
    ('config_create_agent',       'Create Agent',           'Create a new agent for this team',                                                'enabled',  'high',     'self-config'),
    ('config_archive_agent',      'Archive Agent',          'Archive (remove) an agent from this team',                                        'enabled',  'high',     'self-config'),
    ('config_undo_last_change',   'Undo Last Change',       'Undo the most recent configuration change within 24 hours',                      'enabled',  'high',     'self-config'),
    -- Credentials
    ('use_credential',            'Use Credential',         'Get an opaque credential handle for a stored secret',                             'enabled',  'medium',   'credentials'),
    ('reveal_secret',             'Reveal Secret',          'Break-glass: reveal the raw value of a stored secret (requires approval)',         'disabled', 'critical', 'credentials'),
    -- Network
    ('http_request',              'HTTP Request',           'Make an HTTP request to an external API with optional credential injection',       'enabled',  'medium',   'network')
),
inserted_tools AS (
  INSERT INTO tenant_tools (tenant_id, customer_id, tool_key, display_name, description, status, risk_level, config, metadata)
  SELECT
    tl.tenant_id,
    tl.customer_id,
    td.tool_key,
    td.display_name,
    td.description,
    td.status,
    td.risk_level,
    '{}'::jsonb,
    jsonb_build_object(
      'provider', 'native',
      'category', td.category,
      'seeded_by', 'migration_00085'
    )
  FROM tenant_list tl
  CROSS JOIN tool_defs td
  ON CONFLICT (tenant_id, tool_key) DO NOTHING
  RETURNING id, tenant_id, customer_id, tool_key, risk_level
)
-- Step 2: Create default policies for newly inserted tools
INSERT INTO tenant_tool_policies (
  tenant_id, customer_id, tool_id,
  approval_mode, allow_roles, max_calls_per_hour, timeout_ms, metadata
)
SELECT
  it.tenant_id,
  it.customer_id,
  it.id,
  CASE
    WHEN it.risk_level = 'critical' THEN 'always'
    ELSE 'none'
  END,
  ARRAY['owner', 'admin', 'operator', 'viewer']::text[],
  120,
  30000,
  jsonb_build_object('seeded_by', 'migration_00085')
FROM inserted_tools it
ON CONFLICT (tenant_id, tool_id) DO NOTHING;

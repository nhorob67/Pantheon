-- Optional denormalized workflow graph tables for faster node/edge querying.
-- Source of truth remains workflow_definitions.draft_graph.

CREATE TABLE workflow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  draft_version INTEGER NOT NULL CHECK (draft_version > 0),
  node_index INTEGER NOT NULL CHECK (node_index >= 0),
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  label TEXT,
  position_x DOUBLE PRECISION,
  position_y DOUBLE PRECISION,
  config JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(config) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, node_index)
);

CREATE INDEX idx_workflow_nodes_workflow
  ON workflow_nodes(workflow_id);
CREATE INDEX idx_workflow_nodes_instance_type
  ON workflow_nodes(instance_id, node_type);
CREATE INDEX idx_workflow_nodes_customer_type
  ON workflow_nodes(customer_id, node_type);
CREATE INDEX idx_workflow_nodes_workflow_node_id
  ON workflow_nodes(workflow_id, node_id);
CREATE INDEX idx_workflow_nodes_workflow_draft_version
  ON workflow_nodes(workflow_id, draft_version);

CREATE TABLE workflow_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  draft_version INTEGER NOT NULL CHECK (draft_version > 0),
  edge_index INTEGER NOT NULL CHECK (edge_index >= 0),
  edge_id TEXT NOT NULL,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  edge_when TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, edge_index)
);

CREATE INDEX idx_workflow_edges_workflow
  ON workflow_edges(workflow_id);
CREATE INDEX idx_workflow_edges_instance_draft
  ON workflow_edges(instance_id, draft_version);
CREATE INDEX idx_workflow_edges_customer_draft
  ON workflow_edges(customer_id, draft_version);
CREATE INDEX idx_workflow_edges_workflow_source
  ON workflow_edges(workflow_id, source_node_id);
CREATE INDEX idx_workflow_edges_workflow_target
  ON workflow_edges(workflow_id, target_node_id);

CREATE OR REPLACE FUNCTION sync_workflow_graph_denormalized_for_workflow(
  p_workflow_id UUID,
  p_instance_id UUID,
  p_customer_id UUID,
  p_draft_version INTEGER,
  p_draft_graph JSONB
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM workflow_edges
  WHERE workflow_id = p_workflow_id;

  DELETE FROM workflow_nodes
  WHERE workflow_id = p_workflow_id;

  IF jsonb_typeof(p_draft_graph) <> 'object' THEN
    RETURN;
  END IF;

  INSERT INTO workflow_nodes (
    workflow_id,
    instance_id,
    customer_id,
    draft_version,
    node_index,
    node_id,
    node_type,
    label,
    position_x,
    position_y,
    config
  )
  SELECT
    p_workflow_id,
    p_instance_id,
    p_customer_id,
    p_draft_version,
    node.ordinality::INTEGER - 1,
    COALESCE(NULLIF(btrim(node.value ->> 'id'), ''), format('node-%s', node.ordinality)),
    COALESCE(NULLIF(btrim(node.value ->> 'type'), ''), 'unknown'),
    NULLIF(btrim(node.value ->> 'label'), ''),
    CASE
      WHEN jsonb_typeof(node.value -> 'position' -> 'x') = 'number'
        THEN (node.value -> 'position' ->> 'x')::DOUBLE PRECISION
      ELSE NULL
    END,
    CASE
      WHEN jsonb_typeof(node.value -> 'position' -> 'y') = 'number'
        THEN (node.value -> 'position' ->> 'y')::DOUBLE PRECISION
      ELSE NULL
    END,
    CASE
      WHEN jsonb_typeof(node.value -> 'config') = 'object'
        THEN node.value -> 'config'
      ELSE '{}'::jsonb
    END
  FROM jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(p_draft_graph -> 'nodes') = 'array'
        THEN p_draft_graph -> 'nodes'
      ELSE '[]'::jsonb
    END
  )
    WITH ORDINALITY AS node(value, ordinality)
  WHERE jsonb_typeof(node.value) = 'object';

  INSERT INTO workflow_edges (
    workflow_id,
    instance_id,
    customer_id,
    draft_version,
    edge_index,
    edge_id,
    source_node_id,
    target_node_id,
    edge_when
  )
  SELECT
    p_workflow_id,
    p_instance_id,
    p_customer_id,
    p_draft_version,
    edge.ordinality::INTEGER - 1,
    COALESCE(NULLIF(btrim(edge.value ->> 'id'), ''), format('edge-%s', edge.ordinality)),
    COALESCE(
      NULLIF(btrim(edge.value ->> 'source'), ''),
      format('missing-source-%s', edge.ordinality)
    ),
    COALESCE(
      NULLIF(btrim(edge.value ->> 'target'), ''),
      format('missing-target-%s', edge.ordinality)
    ),
    COALESCE(NULLIF(btrim(edge.value ->> 'when'), ''), 'always')
  FROM jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(p_draft_graph -> 'edges') = 'array'
        THEN p_draft_graph -> 'edges'
      ELSE '[]'::jsonb
    END
  )
    WITH ORDINALITY AS edge(value, ordinality)
  WHERE jsonb_typeof(edge.value) = 'object';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_workflow_graph_denormalized_from_definition()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM sync_workflow_graph_denormalized_for_workflow(
    NEW.id,
    NEW.instance_id,
    NEW.customer_id,
    NEW.draft_version,
    NEW.draft_graph
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Backfill denormalized rows for existing workflows.
SELECT sync_workflow_graph_denormalized_for_workflow(
  id,
  instance_id,
  customer_id,
  draft_version,
  draft_graph
)
FROM workflow_definitions;

CREATE TRIGGER workflow_definitions_sync_denormalized_graph_after_insert
  AFTER INSERT ON workflow_definitions
  FOR EACH ROW
  EXECUTE FUNCTION sync_workflow_graph_denormalized_from_definition();

CREATE TRIGGER workflow_definitions_sync_denormalized_graph_after_update
  AFTER UPDATE OF draft_graph, draft_version, instance_id, customer_id
  ON workflow_definitions
  FOR EACH ROW
  WHEN (
    NEW.draft_graph IS DISTINCT FROM OLD.draft_graph
    OR NEW.draft_version IS DISTINCT FROM OLD.draft_version
    OR NEW.instance_id IS DISTINCT FROM OLD.instance_id
    OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
  )
  EXECUTE FUNCTION sync_workflow_graph_denormalized_from_definition();

ALTER TABLE workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workflow nodes"
  ON workflow_nodes FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can insert own workflow nodes"
  ON workflow_nodes FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can update own workflow nodes"
  ON workflow_nodes FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can delete own workflow nodes"
  ON workflow_nodes FOR DELETE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can view own workflow edges"
  ON workflow_edges FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can insert own workflow edges"
  ON workflow_edges FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can update own workflow edges"
  ON workflow_edges FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can delete own workflow edges"
  ON workflow_edges FOR DELETE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = (select auth.uid())));

CREATE TRIGGER workflow_nodes_updated_at
  BEFORE UPDATE ON workflow_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER workflow_edges_updated_at
  BEFORE UPDATE ON workflow_edges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

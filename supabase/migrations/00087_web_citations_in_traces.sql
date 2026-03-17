-- Phase 2.3: Add web citations to conversation traces
-- Stores structured citation data from web_search and web_fetch tool invocations
-- so the dashboard can display source links alongside agent responses.

ALTER TABLE tenant_conversation_traces
  ADD COLUMN IF NOT EXISTS web_citations jsonb DEFAULT NULL;

COMMENT ON COLUMN tenant_conversation_traces.web_citations IS
  'Structured citations from web_search/web_fetch: [{url, title, snippet?, fetched_at}]';

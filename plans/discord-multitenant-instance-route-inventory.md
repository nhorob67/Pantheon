# Discord Multi-Tenant Migration: `/api/instances/*` Route Inventory

Date: 2026-02-23  
Scope: `src/app/api/instances/**/route.ts`  
Total handlers: 51

## Tag Definitions

- `retain`: keep active in legacy path during migration (no immediate tenant equivalent required).
- `adapt`: capability must exist in tenant runtime; build `/api/tenants/*` equivalent and migrate.
- `bridge`: keep route operational by forwarding to tenant services or compatibility adapter.
- `retire`: deprecate and remove after migration/cutover (or when replacement is live).

## Inventory

| Route | Methods | Tag | Notes |
|---|---|---|---|
| `/api/instances/provision` | `POST` | `bridge` | Legacy VPS/OpenClaw provisioning; keep until provisioning is disabled. |
| `/api/instances/boot-key` | `POST` | `retain` | Required for legacy cloud-init/LUKS boot flow while legacy instances exist. |
| `/api/instances/[id]/status` | `GET` | `bridge` | Keep status surface while migrating to tenant runtime health model. |
| `/api/instances/[id]/stop` | `POST` | `bridge` | Legacy lifecycle control; adapter path until central runtime cutover. |
| `/api/instances/[id]/restart` | `POST` | `bridge` | Legacy lifecycle control; adapter path until central runtime cutover. |
| `/api/instances/[id]/config` | `PUT` | `bridge` | Legacy runtime config rebuild path; transitions to tenant config APIs. |
| `/api/instances/[id]/update-skills` | `POST` | `bridge` | Temporary compatibility for skill toggles tied to legacy runtime. |
| `/api/instances/[id]/deprovision` | `POST` | `bridge` | Maintain only while legacy infra exists; retire after migration. |
| `/api/instances/[id]/agents` | `GET,POST` | `adapt` | Agent CRUD continues in tenant runtime model. |
| `/api/instances/[id]/agents/[agentId]` | `PUT,DELETE` | `adapt` | Agent mutation moves to tenant-scoped contracts. |
| `/api/instances/[id]/knowledge` | `GET,POST` | `adapt` | Knowledge ingestion persists in tenant data plane. |
| `/api/instances/[id]/knowledge/[fileId]` | `PUT,DELETE` | `adapt` | Knowledge lifecycle remains required in tenant model. |
| `/api/instances/[id]/memory/settings` | `GET,PUT` | `adapt` | Memory policies/settings map to tenant memory controls. |
| `/api/instances/[id]/memory/checkpoint` | `POST` | `adapt` | Checkpoint semantics migrate to tenant session/memory service. |
| `/api/instances/[id]/memory/compress` | `POST` | `adapt` | Compaction operations migrate to tenant memory jobs. |
| `/api/instances/[id]/mcp-servers` | `GET,POST` | `adapt` | Tooling/integration surface remains a tenant capability. |
| `/api/instances/[id]/mcp-servers/[serverId]` | `PUT,DELETE` | `adapt` | Tenant tool/integration management replacement required. |
| `/api/instances/[id]/composio` | `GET,POST,PUT,DELETE` | `adapt` | Integration management continues in tenant model. |
| `/api/instances/[id]/composio/connect` | `POST` | `adapt` | OAuth initiation remains tenant integration behavior. |
| `/api/instances/[id]/composio/callback` | `GET` | `adapt` | OAuth callback remains required under tenant integration namespace. |
| `/api/instances/[id]/composio/connections` | `GET,DELETE` | `adapt` | Connected app management remains tenant-scoped capability. |
| `/api/instances/[id]/composio/toolkits` | `GET,PUT` | `adapt` | Toolkit policy/config belongs in tenant tool policy layer. |
| `/api/instances/[id]/workflow-approvals` | `GET` | `retire` | Replace with generic tenant approval queue APIs. |
| `/api/instances/[id]/workflow-approvals/[approvalId]/approve` | `POST` | `retire` | Replace with tenant approval decisions API. |
| `/api/instances/[id]/workflow-approvals/[approvalId]/reject` | `POST` | `retire` | Replace with tenant approval decisions API. |
| `/api/instances/[id]/workflow-playbooks` | `GET,POST` | `retire` | Visual workflow builder expansion is deprecated. |
| `/api/instances/[id]/workflow-playbooks/[playbookId]/install` | `POST` | `retire` | Replace only if needed by future tenant runtime templates. |
| `/api/instances/[id]/workflow-templates` | `GET,POST` | `retire` | Workflow template surface is on sunset path. |
| `/api/instances/[id]/workflow-templates/[templateId]/use` | `POST` | `retire` | Workflow template usage retires with builder path. |
| `/api/instances/[id]/workflow-runs` | `GET` | `retire` | Legacy workflow run explorer; sunset with workflow builder path. |
| `/api/instances/[id]/workflow-runs/[runId]` | `GET` | `retire` | Legacy workflow run detail endpoint. |
| `/api/instances/[id]/workflow-runs/[runId]/cancel` | `POST` | `retire` | Legacy workflow run control endpoint. |
| `/api/instances/[id]/workflow-runs/[runId]/retry-step` | `POST` | `retire` | Legacy workflow retry control endpoint. |
| `/api/instances/[id]/workflow-runs/[runId]/artifacts/[artifactId]/download` | `GET` | `retire` | Legacy workflow artifact path. |
| `/api/instances/[id]/workflows` | `GET,POST` | `retire` | Workflow builder CRUD sunset path. |
| `/api/instances/[id]/workflows/generate-draft` | `POST` | `retire` | Workflow NL draft generation sunset path. |
| `/api/instances/[id]/workflows/import` | `POST` | `retire` | Workflow import endpoint sunset path. |
| `/api/instances/[id]/workflows/performance` | `POST,GET` | `retire` | Workflow performance telemetry endpoint sunset path. |
| `/api/instances/[id]/workflows/launch-readiness` | `GET` | `retire` | Workflow-specific launch readiness endpoint sunset path. |
| `/api/instances/[id]/workflows/launch-readiness/snapshots` | `GET,POST` | `retire` | Workflow-specific snapshot endpoint sunset path. |
| `/api/instances/[id]/workflows/[workflowId]` | `GET,PUT` | `retire` | Workflow definition detail/edit sunset path. |
| `/api/instances/[id]/workflows/[workflowId]/status` | `PATCH` | `retire` | Workflow status mutation sunset path. |
| `/api/instances/[id]/workflows/[workflowId]/validate` | `POST` | `retire` | Workflow validation endpoint sunset path. |
| `/api/instances/[id]/workflows/[workflowId]/publish` | `POST` | `retire` | Workflow publish endpoint sunset path. |
| `/api/instances/[id]/workflows/[workflowId]/clone` | `POST` | `retire` | Workflow clone endpoint sunset path. |
| `/api/instances/[id]/workflows/[workflowId]/export` | `GET` | `retire` | Workflow export endpoint sunset path. |
| `/api/instances/[id]/workflows/[workflowId]/simulate` | `POST` | `retire` | Workflow simulation endpoint sunset path. |
| `/api/instances/[id]/workflows/[workflowId]/experiment` | `POST` | `retire` | Workflow experiment endpoint sunset path. |
| `/api/instances/[id]/workflows/[workflowId]/run` | `POST` | `retire` | Workflow run trigger endpoint sunset path. |
| `/api/instances/[id]/workflows/[workflowId]/rollback` | `POST` | `retire` | Workflow rollback endpoint sunset path. |
| `/api/instances/[id]/workflows/[workflowId]/promotions` | `GET,POST` | `retire` | Workflow promotion endpoint sunset path. |

## Summary by Tag

- `retain`: 1
- `adapt`: 14
- `bridge`: 7
- `retire`: 29

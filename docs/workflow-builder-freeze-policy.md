# Workflow Builder Freeze Policy (Pre-Launch)

Last updated: February 24, 2026  
Status: Active

## Decision

The visual workflow builder is in legacy maintenance mode for the multi-tenant runtime migration window.

## Policy

1. No new workflow-builder feature work is approved during pre-launch migration.
2. Allowed changes are limited to:
   - break/fix production issues
   - security fixes
   - migration-critical compatibility fixes required for internal dogfood continuity
3. Any exception must include:
   - explicit owner
   - reason tied to launch-critical runtime safety/continuity
   - rollback plan

## Practical implications

1. Prioritize tenant runtime approvals/governance/exports over workflow-builder expansion.
2. Keep workflow-builder UI de-emphasized as legacy in navigation and docs.
3. Route new investment to tenant-native runtime surfaces under `/api/tenants/[tenantId]/*`.

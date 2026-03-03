# Tenant Runtime Tool Parity Harness

Last updated: February 24, 2026  
Scope: Phase 4.3 offline regression gate for transcript-driven tool behavior

## Purpose

Provide a repeatable, credential-free regression harness that validates runtime tool behavior against conversation-style transcript fixtures.

## Fixture source

`src/lib/runtime/__fixtures__/tenant-tool-parity-transcripts.json`

Each fixture defines:

1. `name`
2. `role`
3. `required_tools`
4. `transcript`

## Test gate

`src/lib/runtime/tenant-tool-parity-harness.test.ts` runs two checks:

1. Tracks pass/fail counts by `tool:role`.
2. Fails when any required high-usage tool regresses in fixture scenarios.

This test is wired into `npm test` as a rollout guard.

## Current high-usage gate set

1. `echo`
2. `time`
3. `hash`

## Extending coverage

1. Add new transcript fixtures for newly introduced runtime tools.
2. Add the tool key to fixture `required_tools` once it is considered launch-critical.
3. Keep unsupported-tool fixtures to verify failure accounting remains accurate.

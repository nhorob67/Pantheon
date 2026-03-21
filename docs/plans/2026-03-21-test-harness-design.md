# Repo Test Harness Design

## Goal

Make the repository test runner resolve TypeScript app modules the same way the app does, so tests can import files that use extensionless local imports and `@/` path aliases without ad hoc workarounds.

## Problem

The current test scripts use `node --experimental-strip-types --test`. That works for simple TypeScript files, but it breaks on parts of the app that rely on bundler-style resolution. In practice this causes tests like `src/lib/ai/tenant-ai-worker.test.ts` to fail before execution because Node cannot resolve imports such as `./client` from runtime modules.

## Options Considered

### 1. Switch to `tsx --test`

Recommended. This keeps the built-in Node test runner model while adding a TypeScript-aware loader that handles modern TS resolution and repository path aliases more reliably.

### 2. Add a custom Node loader

Possible, but it would add bespoke loader code just to reproduce behavior that `tsx` already provides.

### 3. Migrate to Vitest or Jest

This would also solve resolution, but it is a much larger change than needed for the current problem.

## Decision

Switch repo test scripts from plain Node strip-types mode to `tsx --test`.

## Scope

- Add `tsx` as a dev dependency.
- Update `npm test` and `npm run test:memory-gate` to use `tsx --test`.
- Keep the existing test file list unchanged.
- Validate that targeted AI worker tests now resolve and execute under the new harness.

## Risks

- Test startup may change slightly because `tsx` becomes part of the harness.
- Some tests may expose real runtime issues once import resolution is fixed.

## Validation

- Run the targeted worker test that previously failed on import resolution.
- Run the focused formatter test suite.
- Run lint on touched files.
- Run a production build to confirm no packaging regressions.

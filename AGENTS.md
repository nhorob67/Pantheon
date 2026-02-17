# Repository Guidelines

## Project Structure & Module Organization
- `src/app/`: Next.js App Router pages and route groups (`(auth)`, `(dashboard)`, `(admin)`), plus API handlers in `src/app/api/`.
- `src/components/`: Feature and UI components grouped by domain (`dashboard`, `onboarding`, `admin`, `landing`, `ui`).
- `src/lib/`: Shared integrations and business logic (`supabase/`, `stripe/`, `coolify/`, `validators/`, `templates/`).
- `src/types/`: Domain and database TypeScript types.
- `supabase/migrations/`: Numbered SQL migrations (`00001_*.sql`, `00002_*.sql`, ...).
- `skills/`: OpenClaw skills and helper scripts. `docker/` contains container/runtime setup. Static assets live in `public/`.

## Build, Test, and Development Commands
- `npm run dev`: Start local dev server at `http://localhost:3000`.
- `npm run build`: Create production build (also surfaces many TypeScript issues).
- `npm run start`: Run the built app.
- `npm run lint`: Run ESLint (Next.js core-web-vitals + TypeScript config).
- `docker compose -f docker/docker-compose.dev.yml up --build`: Build and run the local containerized OpenClaw flow.

## Coding Style & Naming Conventions
- Stack is TypeScript + React 19 + Next.js App Router (`tsconfig.json` has `strict: true`).
- Follow existing formatting: 2-space indentation, semicolons, double quotes.
- Use the `@/` path alias for imports from `src` (for example, `@/lib/supabase/server`).
- Prefer server components by default; add `"use client"` only for hooks, event handlers, or browser-only APIs.
- Match existing file naming with kebab-case (for example, `agent-form.tsx`, `openclaw-config.ts`).

## Testing Guidelines
- No test framework or `npm test` script is currently configured.
- Minimum required checks before submitting changes: `npm run lint` and `npm run build`.
- If you add tests, colocate as `*.test.ts(x)` or `*.spec.ts(x)` near the feature and add the new test command to `package.json`.

## Commit & Pull Request Guidelines
- Current git history is minimal (single bootstrap commit), so no strict legacy convention exists yet.
- Use concise, imperative commit messages; Conventional Commits are recommended (example: `feat: add instance restart endpoint`).
- PRs should include: purpose, key changes, validation commands run, linked issue, and screenshots for UI changes.

## Security & Configuration Tips
- Copy `.env.local.example` to `.env.local`; never commit secrets.
- Keep Supabase service-role keys, Stripe keys, Coolify tokens, and API keys out of source control.
- For local development without external orchestration, set `COOLIFY_API_URL=mock`.

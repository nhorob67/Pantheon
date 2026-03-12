# Pantheon UI/UX Overhaul Plan

## Context

A comprehensive audit of ~100+ source files and competitive research across 8 agentic platforms (CrewAI, Relevance AI, Zapier AI, Lindy AI, Botpress, Voiceflow, n8n, AgentGPT) revealed that Pantheon has a strong design foundation but needs targeted improvements to reach world-class UI/UX. The warm dark theme is distinctive, the onboarding flow is excellent, and the docs site is polished — but gaps in mobile responsiveness, accessibility, design system completeness, and competitive UX parity need addressing.

This plan is organized into 3 phases by priority: Critical fixes, High-impact competitive parity, and World-class polish.

## Status

Implementation work in Phases 1-3 has been reconciled against the current codebase on 2026-03-11. The remaining unchecked items in this document are manual browser and accessibility QA tasks, not unimplemented engineering work.

---

## Phase 1: Critical Fixes (Foundation)

These block accessibility compliance, mobile usability, and code maintainability.

### 1.1 Mobile Responsive Landing Page
- [x] Add `@media (max-width: 768px)` breakpoint to `src/app/globals.css`
- [x] Stack `.platform-grid` to 1 column on mobile (handled at the 768px breakpoint; 769-900px is still a 2-column tablet layout)
- [x] Stack pricing features grid to 1 column (existing 900px breakpoint handles this)
- [x] Stack trust grid to 1 column (existing 900px breakpoint handles this)
- [x] Reduce nav padding on mobile (existing 900px breakpoint handles this)
- [x] Reduce section padding on mobile (existing 900px+480px breakpoints handle this)
- [x] Hero grid stacks vertically (existing 900px breakpoint handles this)
- [x] Add touch-friendly button sizes (min 44px via `@media (pointer: coarse)`)
- [ ] Test all landing sections at 375px, 768px, 1024px viewports (manual verification still needed; current CSS implies a 1-column layout only at `<=768px`, with a 2-column tablet state from `769px` to `900px`)

**Files:** `src/app/globals.css`

### 1.2 WCAG Accessibility Fixes
- [x] Increase `--text-dim` from `#5C544A` to `#7A7060` for 4.5:1 contrast ratio — `src/app/globals.css:15`
- [x] Add `@media (prefers-reduced-motion: reduce)` block to disable animations — `src/app/globals.css`
- [x] Increase input focus ring from `ring-primary/20` to `ring-primary/40` — `src/components/ui/input.tsx`
- [x] Add `aria-describedby` linking error messages to inputs — `src/components/ui/input.tsx`, `src/components/ui/select.tsx`
- [x] Add "Skip to main content" link to dashboard layout — `src/app/(dashboard)/layout.tsx`
- [x] Add visible focus rings to all button variants — `src/components/ui/button.tsx`
- [x] Add `aria-live="polite"` to buttons during loading state changes — `src/components/ui/button.tsx`
- [ ] Verify and fix contrast ratios for `text-foreground/50` on dark backgrounds (manual verification needed)

**Files:** `src/app/globals.css`, `src/components/ui/input.tsx`, `src/components/ui/select.tsx`, `src/components/ui/button.tsx`, `src/app/(dashboard)/layout.tsx`

### 1.3 Unify Color Variable System
- [x] Audit all components for dual-pattern usage (`text-[var(--text-primary)]` vs `text-text-primary`) — migrated all 8 files: step1-team, step2-agent, step3-discord, wizard-shell, provisioning-progress, discord-server-mockup, combobox, landing nav
- [x] Pick one pattern (Tailwind theme classes) and migrate all components to it — zero `[var(--` class patterns remain in src/; residual CSS optimizer warning is a Tailwind 4 internal artifact (not caused by source code)
- [x] Define missing color tokens in `globals.css`: `--intelligence`, `--energy` (already existed in @theme block)
- [x] Replace `bg-amber-600` in `src/components/dashboard/trial-banner.tsx` → `hover:bg-primary/80`
- [x] Replace `bg-amber-600` in `src/components/dashboard/trial-expired-overlay.tsx` → `hover:bg-primary/80`
- [x] Replace Discord blue in `src/components/onboarding/wizard-shell.tsx` → `var(--discord)`
- [x] Replace `rgba(88, 101, 242, 0.1)` in `src/components/landing/how-it-works.tsx` → `var(--discord-dim)`
- [x] Fix OG image colors to match CSS variables — `src/app/opengraph-image.tsx`
- [x] Remove `!important` from nav CTA — `src/app/globals.css`
- [x] Review `rgba(196,136,63,0.2)` in `button.tsx` shadow — retained intentionally because Tailwind arbitrary shadow values cannot reference CSS variables directly without a custom utility

**Files:** `src/app/globals.css`, `src/app/opengraph-image.tsx`, `src/components/ui/button.tsx`, `src/components/dashboard/trial-banner.tsx`, `src/components/dashboard/trial-expired-overlay.tsx`, `src/components/onboarding/wizard-shell.tsx`, `src/components/landing/how-it-works.tsx`

### 1.4 Missing UI Primitives
- [x] Create `src/components/ui/checkbox.tsx` — labeled checkbox with 44px touch target, aria-describedby
- [x] Create `src/components/ui/textarea.tsx` — created with label/error wiring and `resize-y`
- [x] Create `src/components/ui/dropdown-menu.tsx` — trigger + items, keyboard nav, click-outside-close
- [x] Create `src/components/ui/table.tsx` — Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell
- [x] Bring `Textarea` and `Checkbox` to full parity with `Input` — added `aria-invalid`, upgraded focus ring to `ring-primary/40`, destructive ring to `/40`, added `ring-offset` to Checkbox
- [x] Replace existing inline `<textarea>` and `<input type="checkbox">` with UI components — all inline checkboxes replaced (0 remaining); inline textareas replaced in 10+ files. Only 3 intentional exceptions remain: `agent-form.tsx` (react-hook-form integration), `agent-preview-chat.tsx` (chat input), `skill-md-editor.tsx` (code editor)

**Files:** New files in `src/components/ui/`

---

## Phase 2: High Impact (Competitive Parity)

These bring Pantheon to feature-parity with leading platforms like CrewAI, Lindy, and Botpress.

### 2.1 Redesign Agent Creation Flow
- [x] Refactor `src/components/dashboard/agent-form/agent-form.tsx` from single-scroll modal to tabbed layout
- [x] Tab 1: Identity (name, role, goal, backstory, autonomy level)
- [x] Tab 2: Skills & Tools (skill toggles, tool controls, Composio)
- [x] Tab 3: Schedules & Advanced (cron toggles, custom schedules)
- [x] Add tab bar with active state indicator
- [x] Mark required fields with visual indicator (asterisk on name, role)
- [x] Add live validation feedback (not just on submit) — switched react-hook-form to `mode: "onBlur"` so errors appear when leaving a field
- [x] Show loading indicator while custom schedules load async — spinner with "Loading schedules…" text in Schedules tab while fetching

**Files:** `src/components/dashboard/agent-form/agent-form.tsx`

### 2.2 Natural Language Agent Creation
- [x] Add "Describe your agent" text input at top of agent creation flow (onboarding step 2)
- [x] Create API route `src/app/api/tenants/[tenantId]/agents/generate/route.ts` (calls Claude Haiku)
- [x] Pre-fill form fields with AI-generated content, let user edit — created `/api/agents/generate` (user-auth-only, no tenant required) and fixed onboarding to call it
- [x] Keep manual form as alternative path ("Or configure manually" divider)
- [x] Add NL generation to the main dashboard agent form — "Describe your agent" card with Wand2 icon, divider, then template picker

**Files:** `src/components/onboarding/step2-agent.tsx`, `src/app/api/tenants/[tenantId]/agents/generate/route.ts`, `src/app/api/agents/generate/route.ts`, `src/components/dashboard/agent-form/agent-form.tsx`

### 2.3 Settings Overview Page
- [x] Create `/settings` landing page with feature cards for each setting area — added Approvals card (Automation) and Exports card (Account)
- [x] Each card shows: icon, title, 1-line description, link
- [x] Group cards by category: Communication, Intelligence, Automation, Infrastructure, Account

**Files:** `src/app/(dashboard)/settings/page.tsx`

### 2.4 Agent Activity Timeline
- [x] Add activity feed component to dashboard showing recent agent actions
- [x] Display: agent name, action type, timestamp, channel, brief summary — rows show icon, agent name, action-type pill label, channel (from agent metadata when available), timestamp, and summary
- [x] Support filtering by agent and action type
- [x] Link to full conversation replay from each activity entry
- [x] Wire up to real data via Server Component (fetches from `tenant_conversation_traces` + `tenant_runtime_runs` tables via `fetchActivityFeed` query)

**Files:** `src/components/dashboard/agent-activity-feed.tsx`, `src/app/(dashboard)/dashboard/page.tsx`

### 2.5 Consolidate Landing Page CTAs
- [x] Standardize all CTA text to "Start Free Trial"
- [x] Remove duplicate "Get Started" from testimonials section
- [x] Nav CTA, Hero CTA, Pricing CTA, Final CTA all consistent
- [x] Removed unused `Link` import from testimonials.tsx

**Files:** `src/components/landing/nav.tsx`, `src/components/landing/hero.tsx`, `src/components/landing/cta.tsx`, `src/components/landing/pricing.tsx`, `src/components/landing/testimonials.tsx`

### 2.6 Standardize Card Padding & Heading Hierarchy
- [x] Standardized all 9 settings pages to consistent pattern:
  - Outer wrapper: `space-y-6 max-w-4xl`
  - Title: `h1 font-headline text-2xl font-semibold`
  - Subtitle: `text-sm text-foreground/60 mt-1`
- [x] Pages updated: ai-model, alerts, billing, channels, knowledge, memory, secrets, skills, workflows/approvals
- [x] Finish standardization across the remaining settings pages — standardized email, mcp-servers, schedules, extensions, approvals, and exports to `space-y-6 max-w-4xl` + `h1` + subtitle pattern

**Files:** All files in `src/app/(dashboard)/settings/*/page.tsx`

---

## Phase 3: World-Class Polish (Differentiators)

### 3.1 Typography Scale System
- [x] Define systematic type scale in `globals.css` using CSS custom properties:
  - `--text-display`, `--text-h1`, `--text-h2`, `--text-h3`, `--text-h4`, `--text-body`, `--text-small`, `--text-xs`
- [x] Define line-height tokens: `--leading-tight`, `--leading-normal`, `--leading-relaxed`
- [x] Define letter-spacing tokens: `--tracking-tight`, `--tracking-normal`, `--tracking-wide`
- [x] Define animation tokens: `--duration-micro`, `--duration-standard`, `--duration-emphasis`, `--ease-standard`
- [x] Apply typography tokens to landing page — `.section-title` uses `var(--text-h1)`, `.section-title-display` uses `var(--text-display)`, `.how-step-title` uses `var(--text-h3)`, line-height/letter-spacing tokens applied to section titles. Dashboard uses Tailwind size classes which are already consistent.

**Files:** `src/app/globals.css`

### 3.2 Spacing Standardization
- [x] Audit `globals.css` for non-standard spacing values — all padding/margin/gap values already align to 4px grid (20px=5, 28px=7, 36px=9, 48px=12, etc.). No off-grid values found.

**Files:** `src/app/globals.css`, various component files

### 3.3 Extract Inline Styles from Landing Components
- [x] Move inline styles from `src/components/landing/platform-grid.tsx` to Tailwind classes
- [x] Added reusable CSS classes for showcase rich content (`.showcase-table`, `.showcase-list`, etc.)
- [x] Move inline styles from `src/components/landing/features.tsx` (~62 `style={{}}` blocks) to Tailwind classes and CSS utility classes
- [x] Move inline styles from `src/components/landing/how-it-works.tsx` (~36 `style={{}}` blocks) to Tailwind classes and CSS utility classes
- [x] Cleaned up inline styles from `nav.tsx`, `hero.tsx`, `channels.tsx`, and `team-section.tsx` — these are now essentially clean (only minor acceptable inline styles remain like dynamic colors)
- [x] Remove inline style in `pricing.tsx` — converted to Tailwind class

**Files:** `src/components/landing/platform-grid.tsx`, `src/app/globals.css`

### 3.4 Docs Site Refinements
- [x] Lower TOC breakpoint from `xl:block` to `lg:block` — `src/components/docs/table-of-contents.tsx`
- [x] Add search suggestions to empty search state — `src/components/docs/docs-search-modal-base.tsx`
- [x] Unify border weight: sidebar border changed from `border-border-light` to `border-border`
- [x] Replace inline `style={{ fontFamily }}` with `font-headline` class in docs sidebar

**Files:** `src/components/docs/table-of-contents.tsx`, `src/components/docs/docs-search-modal-base.tsx`, `src/components/docs/docs-sidebar.tsx`

### 3.5 Dashboard Navigation Enhancements
- [x] Add breadcrumbs component — `src/components/dashboard/breadcrumbs.tsx`
- [x] Add tooltips to icon-only buttons on agent cards — `src/components/dashboard/agent-card.tsx`
- [x] Integrate breadcrumbs into dashboard layout — renders in `<main>` for all deep routes; auto-hides on single-segment pages (dashboard, onboarding)
- [x] Show built-in skills (memory, schedules) alongside custom skills in agent form — added "Always on" built-in skill rows with Brain/CalendarClock icons above custom skill toggles

**Files:** `src/components/dashboard/breadcrumbs.tsx`, `src/components/dashboard/agent-card.tsx`

### 3.6 Animation Consistency
- [x] Define standard easing curve and durations as CSS custom properties
- [x] CSS transitions in `globals.css` now use `--duration-micro` (150ms), `--duration-standard` (300ms), `--duration-emphasis` (500ms) and `--ease-standard` tokens — applied across nav, buttons, cards, how-it-works steps, discord mockup, platform tiles, footer links, and other interactive elements (~20 rules updated)
- [x] Landing/onboarding sections use `motion/react` for entrance animations; CSS transitions retained for hover/focus interactions (appropriate for their simplicity)

**Files:** `src/app/globals.css`

---

## Verification

### Phase 1 Verification
- [x] Run `npm run build` — passes on 2026-03-11 with no TypeScript errors; still emits a CSS optimizer warning related to generated `text-[var(...)]`
- [x] Run `npm run lint` — passes on 2026-03-11 after removing an unused variable in `src/lib/queries/activity-feed.ts`
- [x] Run `npm run test` — 326 pass / 327 total, 0 fail, 1 skipped
- [ ] Test landing page at 375px, 768px, 1024px, 1440px viewports in browser DevTools
- [ ] Run WCAG contrast checker on all text-dim elements
- [ ] Keyboard-navigate through dashboard: Tab through sidebar, forms, buttons — all have visible focus
- [ ] Verify new UI primitives render correctly in their consuming components

### Phase 2 Verification
- [ ] Create agent via tabbed form — verify all fields save correctly
- [ ] Test natural language agent generation — verify fields pre-fill
- [ ] Navigate to `/settings` in the browser — overview page compiles with all settings areas covered; browser validation still needed
- [ ] Check agent activity feed loads with real data
- [x] Verify landing page CTA consolidation (confirmed via code review)
- [ ] Verify consistent card padding and heading sizes across all settings pages — all 15 settings pages now use the standard pattern; browser spot-check still needed

### Phase 3 Verification
- [ ] Verify typography scale applied consistently (inspect element spot-checks)
- [x] Verify no inline `style` props remain in landing components — `features.tsx`, `how-it-works.tsx`, `pricing.tsx` at 0; remaining styles in `nav.tsx` (1), `hero.tsx` (2), `channels.tsx` (3), `team-section.tsx` (3) are dynamic/acceptable
- [ ] Verify docs TOC visible at 1024px viewport — the breakpoint changed to `lg`, but browser spot-check is still pending
- [ ] Verify breadcrumbs render on deep settings pages (now integrated in layout; browser spot-check needed)
- [ ] Verify animation easing feels consistent across all interactive elements

---

## Remaining Manual QA

1. Browser viewport pass for the landing page at 375px, 768px, 1024px, and 1440px.
2. Accessibility spot-checks for `text-foreground/50` contrast, keyboard navigation, focus visibility, and new form primitives in context.
3. Functional browser QA for the tabbed agent form, natural-language generation flows, `/settings` overview, and the activity feed with real tenant data.
4. Visual spot-checks for typography consistency, docs TOC visibility at 1024px, breadcrumbs on deep routes, and animation consistency.

# FarmClaw Visual Builder Screen UX Specification

Last updated: February 16, 2026  
Status: Draft (pre-implementation)

## 1) Purpose

Define the builder-screen UX in implementation-ready detail, interaction-by-interaction, before coding begins.

This spec covers:
- The builder screen only (canvas authoring + run/debug panel + publish flow).
- User interactions, system responses, feedback, error handling, accessibility, and telemetry.

This spec does not cover:
- Final backend data schema details (covered in master plan).
- Marketing site UX.
- Mobile-native app UX.

## 2) Success Criteria

- A first-time user can create, validate, and publish a basic workflow in <= 10 minutes.
- A returning user can edit and republish an existing workflow in <= 3 minutes.
- A user can identify and fix validation errors without leaving the builder.
- A user can diagnose a failed run and retry from the failed step without opening external logs.

## 3) Design Anchors (FarmClaw Alignment)

Use existing visual language from current dashboard styles:
- Surface tokens: `bg-bg-deep`, `bg-bg-card`, `bg-bg-dark`, `border-border`, `border-border-light`.
- Text tokens: `text-text-primary`, `text-text-secondary`, `text-text-dim`.
- Primary action tone: amber accent (`bg-accent`, `hover:bg-accent-light`) where appropriate.
- Existing badge semantics:
  - Success: `bg-primary/10 text-primary`
  - Warning: `bg-energy/10 text-amber-700`
  - Error: `bg-destructive/10 text-destructive`
  - Info: `bg-intelligence/10 text-intelligence`
  - Neutral: `bg-muted text-foreground/60`
- Existing control radius/shape:
  - Rounded cards: `rounded-xl`
  - Input controls: `rounded-lg`
  - Primary action buttons: rounded, high-contrast, explicit hover states

Do not introduce a new color system for the builder.

## 4) Screen Information Architecture

## 4.1 Regions

1. Top action bar
- Workflow name, status badge, save state, validate, publish, run-now.

2. Left rail: node library
- Node groups, search, template quick-insert, drag source.

3. Center canvas
- Graph surface with nodes, edges, selection, pan/zoom, mini controls.

4. Right rail: inspector + validation
- Selected-node config editor and validation list.

5. Bottom drawer: run timeline
- Recent runs, step logs, step I/O preview, retry/cancel.

## 4.2 Layout behavior

- Desktop (`>=1280px`): all 5 regions visible.
- Tablet (`768px-1279px`): left rail collapsible; right rail tabs (`Inspector` / `Validation`).
- Mobile (`<768px`): builder editing disabled in V1; show read-only summary + message:
  - "Workflow editing is optimized for desktop. Use desktop to edit safely."

## 5) Global State Model

## 5.1 Draft lifecycle state

1. `clean` -> no unsaved local changes
2. `dirty` -> local changes pending autosave
3. `saving` -> autosave/manual save in progress
4. `save_error` -> last save failed, retry available

## 5.2 Validation state

1. `unknown` -> not yet validated since latest edits
2. `valid` -> no blocking issues
3. `invalid` -> blocking errors exist
4. `warning_only` -> non-blocking warnings

## 5.3 Publication state

1. `draft`
2. `published`
3. `publishing`
4. `publish_failed`

## 5.4 Execution state (per run)

1. `queued`
2. `running`
3. `paused_waiting_approval`
4. `completed`
5. `failed`
6. `canceled`

## 6) Interaction Specification (Interaction-by-Interaction)

Each interaction includes:
- Trigger
- Preconditions
- Primary flow
- Feedback and microcopy
- Error handling
- Accessibility notes
- Telemetry

## INT-001 Open Builder

- Trigger: user clicks workflow in workflow list.
- Preconditions: user has access to instance/workflow.
- Primary flow:
1. Load shell immediately (skeleton regions).
2. Load workflow graph and latest draft metadata.
3. Initialize viewport to fit graph bounds with padding.
- Feedback and microcopy:
  - Loading: "Loading workflow..."
  - Loaded: status badge + save state shown in top bar.
- Error handling:
  - 404: "Workflow not found."
  - 403: "You do not have access to this workflow."
  - 500: "Could not load workflow. Try again."
- Accessibility:
  - Focus moves to page heading on load.
  - Skeleton regions have `aria-busy=true`.
- Telemetry:
  - `workflow.builder.opened`
  - `workflow.builder.open_failed`

## INT-002 Create New Workflow

- Trigger: click `New Workflow`.
- Preconditions: instance exists and user has create permission.
- Primary flow:
1. Show "New Workflow" modal (name + starter template).
2. Create draft workflow.
3. Route to builder with starter graph.
- Feedback and microcopy:
  - Success toast: "Workflow draft created."
- Error handling:
  - Duplicate name: inline error under name field.
  - API failure: toast "Could not create workflow."
- Accessibility:
  - Modal traps focus.
  - `Enter` submits when valid.
- Telemetry:
  - `workflow.create.started`
  - `workflow.create.completed`
  - `workflow.create.failed`

## INT-003 Rename Workflow

- Trigger: user edits name in top action bar.
- Preconditions: editable workflow loaded.
- Primary flow:
1. Name field enters edit mode on click.
2. Save on `Enter` or blur.
3. Preserve current viewport and selection.
- Feedback and microcopy:
  - Save state pill transitions to `Saving...` then `Saved`.
- Error handling:
  - Validation: "Name must be 3-80 characters."
- Accessibility:
  - Name field has explicit label for screen readers.
- Telemetry:
  - `workflow.rename`

## INT-004 Pan Canvas

- Trigger: click-drag on empty canvas, trackpad drag, or space+drag.
- Preconditions: builder loaded.
- Primary flow:
1. Pan without selecting nodes.
2. Keep selection unchanged.
- Feedback and microcopy:
  - Cursor changes to grab/grabbing.
- Error handling: none.
- Accessibility:
  - Keyboard alternatives provided in command palette (`Center canvas`, `Fit view`).
- Telemetry:
  - `workflow.canvas.pan`

## INT-005 Zoom and Fit View

- Trigger: mouse wheel + modifier, UI zoom controls, keyboard shortcuts.
- Preconditions: builder loaded.
- Primary flow:
1. Zoom in/out anchored to pointer.
2. Fit view includes all visible nodes with 12-16% padding.
- Feedback and microcopy:
  - Temporary zoom chip: "85%" for 1.5s.
- Error handling: clamp zoom range.
- Accessibility:
  - Zoom controls keyboard-focusable.
- Telemetry:
  - `workflow.canvas.zoom`
  - `workflow.canvas.fit_view`

## INT-006 Select Single Node

- Trigger: click node.
- Preconditions: node exists.
- Primary flow:
1. Node shows selected state.
2. Inspector panel loads node-specific form.
3. Validation highlights for that node render inline.
- Feedback and microcopy:
  - Inspector header: node icon + node type + node id.
- Error handling:
  - If node deleted remotely, clear inspector and show toast.
- Accessibility:
  - Node receives visible focus ring when selected by keyboard.
- Telemetry:
  - `workflow.node.selected`

## INT-007 Multi-Select Nodes

- Trigger: shift-click nodes or marquee select.
- Preconditions: >=2 nodes.
- Primary flow:
1. Multi-selection chip appears: "`N` nodes selected".
2. Inspector switches to bulk actions only (move, align, delete, duplicate).
- Feedback and microcopy:
  - Bulk hint: "Use arrow keys for nudge."
- Error handling: none.
- Accessibility:
  - Marquee action has keyboard equivalent via command palette.
- Telemetry:
  - `workflow.node.multi_select`

## INT-008 Open Node Library

- Trigger: click left rail if collapsed or shortcut.
- Preconditions: builder loaded.
- Primary flow:
1. Expand left rail to default width.
2. Persist open/closed preference per user.
- Feedback and microcopy: none.
- Error handling: none.
- Accessibility:
  - Rail toggle has `aria-expanded`.
- Telemetry:
  - `workflow.library.toggled`

## INT-009 Search and Filter Node Library

- Trigger: type in node search input or click category chips.
- Preconditions: library open.
- Primary flow:
1. Filter node cards as user types.
2. Show count and empty result state.
- Feedback and microcopy:
  - Empty result: "No nodes match that search."
- Error handling: none.
- Accessibility:
  - Search input has label, not placeholder-only.
- Telemetry:
  - `workflow.library.search`
  - `workflow.library.filter`

## INT-010 Add Node by Drag and Drop

- Trigger: drag node card from library to canvas.
- Preconditions: library open.
- Primary flow:
1. Drop preview appears on canvas.
2. On drop, create node with default config.
3. Auto-select new node and open inspector.
- Feedback and microcopy:
  - Toast info: "Node added."
- Error handling:
  - Capacity/rule violation -> prevent drop and show reason.
- Accessibility:
  - Keyboard alternative: `A` opens add-node command menu at selection.
- Telemetry:
  - `workflow.node.added`

## INT-011 Quick Add Node From Edge

- Trigger: click `+` affordance on outgoing edge handle.
- Preconditions: source node selected.
- Primary flow:
1. Context menu opens with relevant node suggestions.
2. On selection, node inserted and auto-connected.
- Feedback and microcopy:
  - Hint: "Added and connected."
- Error handling:
  - If connection invalid for node type, block and explain.
- Accessibility:
  - Context menu keyboard navigable with arrows/enter/escape.
- Telemetry:
  - `workflow.node.quick_add`

## INT-012 Connect Nodes

- Trigger: drag from source handle to target handle.
- Preconditions: valid handle types.
- Primary flow:
1. Show live connection line.
2. Compatible targets highlight; incompatible dim.
3. On drop to valid target, create edge.
- Feedback and microcopy:
  - Edge label defaults to `Always` unless conditional branch.
- Error handling:
  - Cycle creation blocked with explicit message.
- Accessibility:
  - Keyboard path builder available from inspector (`Connect to...`).
- Telemetry:
  - `workflow.edge.created`
  - `workflow.edge.blocked`

## INT-013 Configure Conditional Edge

- Trigger: click edge label or conditional branch in inspector.
- Preconditions: source node supports conditional branching.
- Primary flow:
1. Edge pill enters edit mode.
2. User sets branch expression or branch token (`true` / `false` / `fallback`).
3. Save validates expression format.
- Feedback and microcopy:
  - Error inline: "Invalid condition syntax."
- Error handling:
  - Duplicate branch token blocked.
- Accessibility:
  - Edge edit popover has focus trap and escape close.
- Telemetry:
  - `workflow.edge.condition_updated`

## INT-014 Reconnect Edge

- Trigger: drag existing edge endpoint to new target.
- Preconditions: edge exists.
- Primary flow:
1. Preserve edge metadata where compatible.
2. Re-validate graph after reconnect.
- Feedback and microcopy:
  - Toast info: "Connection updated."
- Error handling:
  - Invalid target -> cancel reconnect and restore original edge.
- Accessibility:
  - Keyboard alternative available in inspector.
- Telemetry:
  - `workflow.edge.reconnected`

## INT-015 Delete Node or Edge

- Trigger: `Delete` key, context menu, toolbar action.
- Preconditions: selection exists.
- Primary flow:
1. Remove selected element(s).
2. Push action to undo stack.
3. Re-run validation.
- Feedback and microcopy:
  - Toast info: "`N` item(s) removed."
- Error handling:
  - Protected trigger node deletion requires confirm dialog.
- Accessibility:
  - Confirm dialog for destructive deletion keyboard operable.
- Telemetry:
  - `workflow.element.deleted`

## INT-016 Duplicate Node

- Trigger: `Cmd/Ctrl+D` or context menu.
- Preconditions: node selected.
- Primary flow:
1. Clone node with new id and offset position.
2. Do not auto-clone edges in V1.
- Feedback and microcopy:
  - Toast info: "Node duplicated."
- Error handling: none.
- Accessibility:
  - Action available in command palette.
- Telemetry:
  - `workflow.node.duplicated`

## INT-017 Edit Node Config in Inspector

- Trigger: user changes form fields in right rail.
- Preconditions: node selected.
- Primary flow:
1. Update local graph state immediately.
2. Mark draft dirty.
3. Inline-validate required fields.
- Feedback and microcopy:
  - Required field helper text uses muted style until invalid.
- Error handling:
  - Field-level message under control; avoid top-level generic error.
- Accessibility:
  - Standard label/input association for every control.
  - Error message linked with `aria-describedby`.
- Telemetry:
  - `workflow.node.config_changed`

## INT-018 Validation Panel Open/Refresh

- Trigger: auto-refresh after edit, manual `Validate` click.
- Preconditions: builder loaded.
- Primary flow:
1. Run graph validator.
2. Group issues by severity: error/warning/info.
3. Render issue count badge in header.
- Feedback and microcopy:
  - `0 errors` state: "Workflow is valid."
- Error handling:
  - Validator exception -> non-blocking error toast + fallback message.
- Accessibility:
  - Issue list uses semantic list structure.
- Telemetry:
  - `workflow.validation.run`
  - `workflow.validation.failed`

## INT-019 Jump to Issue

- Trigger: click issue row in validation panel.
- Preconditions: issue references node/edge.
- Primary flow:
1. Center canvas on offending element.
2. Select element and open relevant inspector section.
- Feedback and microcopy:
  - Highlight pulse on target for 800ms.
- Error handling:
  - Missing element -> show "Issue is stale, revalidate required."
- Accessibility:
  - Focus follows to inspector headline.
- Telemetry:
  - `workflow.validation.issue_navigated`

## INT-020 Autosave

- Trigger: debounced after edits (2s idle).
- Preconditions: draft dirty and local changes present.
- Primary flow:
1. Status chip transitions `Unsaved` -> `Saving...` -> `Saved`.
2. Save operation non-blocking.
- Feedback and microcopy:
  - Save chip text only, no toast on normal saves.
- Error handling:
  - On failure: chip `Save failed`, show retry action.
- Accessibility:
  - Save status announced via polite live region.
- Telemetry:
  - `workflow.autosave.started`
  - `workflow.autosave.succeeded`
  - `workflow.autosave.failed`

## INT-021 Manual Save

- Trigger: `Cmd/Ctrl+S` or `Save` button.
- Preconditions: draft loaded.
- Primary flow:
1. Immediate save request.
2. Clear dirty marker.
- Feedback and microcopy:
  - Success toast optional only when triggered manually.
- Error handling:
  - Save lock conflict -> show conflict modal.
- Accessibility:
  - Shortcut advertised in tooltip and command palette.
- Telemetry:
  - `workflow.save.manual`

## INT-022 Undo and Redo

- Trigger: `Cmd/Ctrl+Z`, `Shift+Cmd/Ctrl+Z`, toolbar arrows.
- Preconditions: history stack present.
- Primary flow:
1. Revert/apply single action.
2. Preserve viewport.
3. Re-run validation.
- Feedback and microcopy:
  - Optional transient label: "Undo: Delete node"
- Error handling:
  - Empty stack buttons disabled.
- Accessibility:
  - Disabled controls include `aria-disabled`.
- Telemetry:
  - `workflow.history.undo`
  - `workflow.history.redo`

## INT-023 Publish Workflow

- Trigger: click `Publish`.
- Preconditions: validation has zero blocking errors.
- Primary flow:
1. Open publish confirm modal with summary:
  - changed nodes
  - changed edges
  - warnings
2. User confirms publish.
3. System creates immutable version, compiles IR, deploys.
4. Status changes to `Publishing` then `Published` or `Publish failed`.
- Feedback and microcopy:
  - Confirm CTA: "Publish version v{n}"
  - Success toast: "Published successfully."
- Error handling:
  - Validation changed since open -> force revalidate before publish.
  - Deploy failure -> keep draft and show rollback guidance.
- Accessibility:
  - Modal has descriptive `aria-label`.
- Telemetry:
  - `workflow.publish.started`
  - `workflow.publish.succeeded`
  - `workflow.publish.failed`

## INT-024 Run Now

- Trigger: click `Run now` in top bar.
- Preconditions: published version exists.
- Primary flow:
1. Start ad-hoc run on latest published version.
2. Open bottom run drawer focused on active run.
- Feedback and microcopy:
  - Status: "Run queued..."
- Error handling:
  - No published version -> CTA disabled with helper text.
- Accessibility:
  - Run drawer opening announced for screen readers.
- Telemetry:
  - `workflow.run.started_manual`

## INT-025 Open Run Timeline

- Trigger: click run in drawer list.
- Preconditions: run exists.
- Primary flow:
1. Show ordered step timeline with per-step status chips.
2. Expand step to inspect input/output/error snapshots.
- Feedback and microcopy:
  - Empty run artifacts: "No artifacts captured for this step."
- Error handling:
  - Artifact retrieval failure -> show retry affordance.
- Accessibility:
  - Timeline uses heading hierarchy and expandable buttons.
- Telemetry:
  - `workflow.run.timeline_opened`
  - `workflow.run.step_expanded`

## INT-026 Retry Failed Step

- Trigger: click `Retry from here` on failed step.
- Preconditions: run failed and step supports retry.
- Primary flow:
1. Confirm retry scope.
2. Create derived run with reference to original run id.
3. Move focus to new run timeline.
- Feedback and microcopy:
  - Success toast: "Retry started from step {name}."
- Error handling:
  - Non-retryable step -> disable action with reason.
- Accessibility:
  - Confirm modal keyboard-operable.
- Telemetry:
  - `workflow.run.retry_started`

## INT-027 Cancel Running Run

- Trigger: click `Cancel run`.
- Preconditions: run status `queued` or `running`.
- Primary flow:
1. Confirm cancellation.
2. Send cancel signal.
3. Update run status to `canceled` when acknowledged.
- Feedback and microcopy:
  - "Cancel requested..."
- Error handling:
  - Cancellation timeout -> show "Still attempting cancellation."
- Accessibility:
  - Status updates announced through live region.
- Telemetry:
  - `workflow.run.cancel_requested`
  - `workflow.run.cancel_completed`

## INT-028 Approval Pending (Builder Context)

- Trigger: run hits approval node.
- Preconditions: approval node in workflow.
- Primary flow:
1. Run status transitions to `paused_waiting_approval`.
2. Step card shows approval badge and request details.
3. "Open approval inbox" deep-link provided.
- Feedback and microcopy:
  - "Waiting for human approval."
- Error handling:
  - Approval policy missing -> fail step with remediation message.
- Accessibility:
  - Approval state reflected in status text, not color only.
- Telemetry:
  - `workflow.approval.requested`

## INT-029 Open Command Palette

- Trigger: `Cmd/Ctrl+K`.
- Preconditions: builder loaded.
- Primary flow:
1. Palette opens centered.
2. Commands grouped: Navigation, Edit, Validate, Run, Publish.
3. Enter executes selected command.
- Feedback and microcopy:
  - Placeholder: "Type a command or search nodes..."
- Error handling:
  - Unsupported command in current state shown disabled with reason.
- Accessibility:
  - Listbox keyboard navigation supported.
- Telemetry:
  - `workflow.command_palette.opened`
  - `workflow.command.executed`

## INT-030 Unsaved Changes on Exit

- Trigger: user navigates away with dirty state.
- Preconditions: `dirty` and unsaved local edits.
- Primary flow:
1. Show leave-confirm modal with options:
  - Save and leave
  - Leave without saving
  - Cancel
- Feedback and microcopy:
  - "You have unsaved changes."
- Error handling:
  - Save attempt fails -> keep modal open with error.
- Accessibility:
  - Focus returns to triggering element on cancel.
- Telemetry:
  - `workflow.exit_guard.shown`
  - `workflow.exit_guard.confirmed`

## INT-031 Conflict Resolution (Stale Draft)

- Trigger: save/publish returns conflict due newer version.
- Preconditions: version mismatch.
- Primary flow:
1. Show conflict modal:
  - My draft timestamp
  - Latest timestamp
  - Diff summary
2. Offer:
  - Reload latest
  - Force save as new draft copy
- Feedback and microcopy:
  - "This workflow changed in another session."
- Error handling:
  - If diff unavailable, still allow safe fallback options.
- Accessibility:
  - Modal content is screen-reader friendly and linearized.
- Telemetry:
  - `workflow.conflict.detected`
  - `workflow.conflict.resolved`

## INT-032 Empty State Template Start

- Trigger: new workflow with no nodes.
- Preconditions: empty graph.
- Primary flow:
1. Show starter cards mapped to core JTBD templates.
2. Clicking a template inserts starter graph and opens inspector on trigger node.
- Feedback and microcopy:
  - "Start with a proven workflow."
- Error handling:
  - Template load failure -> fallback to blank canvas and toast.
- Accessibility:
  - Template cards are keyboard-selectable buttons.
- Telemetry:
  - `workflow.template.applied`

## 7) Keyboard Shortcut Contract (V1)

- `Cmd/Ctrl+S`: Save
- `Cmd/Ctrl+Z`: Undo
- `Shift+Cmd/Ctrl+Z`: Redo
- `Delete` / `Backspace`: Delete selected element
- `Cmd/Ctrl+D`: Duplicate selected node
- `Cmd/Ctrl+K`: Command palette
- `F`: Fit view
- `+` and `-`: Zoom
- `Esc`: Clear selection or close popovers/modals

All shortcuts must be listed in:
- command palette footer
- help tooltip in top bar

## 8) Accessibility Requirements

## 8.1 Focus and keyboard

- Never remove focus outlines without replacement.
- Every interactive control has visible focus state.
- Tab order follows visual order.
- Modal/popup patterns use proper focus trapping and escape behavior.

## 8.2 Contrast and semantics

- Body text contrast >= WCAG minimum.
- Status always encoded with text label plus color.
- Icons never carry meaning alone.

## 8.3 Screen-reader behavior

- Save/publish/run status messages announced in polite live region.
- Validation issue list exposes count and each issue as navigable control.
- Timeline steps expose status in accessible name.

## 9) Motion and Transitions

- Standard transition durations:
  - 150ms: hover/focus states
  - 200-250ms: drawer/panel open-close
  - 300ms max: modal entrance
- Use transform/opacity-based animations only.
- Respect `prefers-reduced-motion`:
  - disable non-essential movement
  - keep opacity fades minimal

## 10) Microcopy Guidelines

- Keep action labels direct and short:
  - `Save`, `Validate`, `Publish`, `Run now`
- Use outcome-first toast phrasing:
  - "Published successfully."
  - "Save failed. Try again."
- Error tone: factual, non-blaming, actionable.
- Avoid ambiguous system language.

## 11) Telemetry Event Contract (Builder UX)

Required payload fields for every event:
- `workflow_id`
- `instance_id`
- `customer_id`
- `user_id`
- `published_version` (nullable)
- `builder_session_id`
- `timestamp`

Minimum event families:
- Builder lifecycle (`opened`, `closed`)
- Graph edit (`node.added`, `node.deleted`, `edge.created`, `edge.deleted`)
- Validation (`run`, `failed`, `issue_navigated`)
- Save/publish (`autosave.*`, `publish.*`)
- Execution (`run.started_manual`, `run.retry_started`, `run.cancel_requested`)
- Errors (`builder.error.*`)

## 12) QA Acceptance Checklist (Builder Screen)

## 12.1 Interaction completeness

- [ ] All INT-001 through INT-032 scenarios implemented.
- [ ] Every destructive action has undo or explicit confirmation.
- [ ] Validation can deep-link user to every issue source.

## 12.2 Accessibility

- [ ] Keyboard-only user can complete create -> validate -> publish.
- [ ] Focus never disappears after modal close.
- [ ] Status and errors are announced correctly.

## 12.3 Performance

- [ ] Canvas interactions maintain target responsiveness in p75.
- [ ] Load and interaction performance budgets pass on reference dataset.

## 12.4 Reliability

- [ ] Save conflicts handled with no silent data loss.
- [ ] Failed run diagnostics visible in UI without console access.

## 13) Open Questions

1. Should V1 support copy/paste of subgraphs between workflows, or defer to V2?
2. Should mobile allow limited editing (inspector-only) or stay read-only until V2?
3. What is the default retry policy per node type in V1 (global vs per-node)?
4. Should publish always trigger deploy immediately, or allow scheduled publish windows?

## 14) Change Log

| Date | Author | Area | Summary |
|---|---|---|---|
| 2026-02-16 | Codex | UX Spec | Initial interaction-by-interaction builder UX specification draft created before implementation. |

## 15) References

- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- WAI-ARIA APG keyboard interface guidance: https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/
- Nielsen Norman Group, 10 usability heuristics: https://www.nngroup.com/articles/ten-usability-heuristics/
- Nielsen Norman Group, progressive disclosure: https://www.nngroup.com/articles/progressive-disclosure/
- web.dev, Interaction to Next Paint: https://web.dev/articles/inp
- web.dev, Core Web Vitals: https://web.dev/articles/vitals
- React Flow performance: https://reactflow.dev/learn/advanced-use/performance
- React Flow accessibility: https://reactflow.dev/learn/advanced-use/accessibility
- AWS Step Functions Workflow Studio: https://docs.aws.amazon.com/step-functions/latest/dg/workflow-studio.html
- Microsoft Copilot Studio flow designer: https://learn.microsoft.com/en-us/microsoft-copilot-studio/flow-designer
- n8n workflow history: https://docs.n8n.io/workflows/history/
- n8n execution debugging: https://docs.n8n.io/workflows/executions/debug/
- Zapier Canvas overview: https://zapier.com/blog/canvas/

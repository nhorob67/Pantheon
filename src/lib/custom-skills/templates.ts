import type { SkillTemplate } from "@/types/custom-skill";

export const SKILL_TEMPLATES: SkillTemplate[] = [
  {
    id: "customer-intake",
    name: "Customer Intake Form",
    category: "customer-support",
    description: "Structured customer intake and issue reporting",
    icon: "Search",
    prompt_hint: "Include structured data collection, priority classification, and follow-up tracking",
    starter_skill_md: `---
name: custom-customer-intake
description: Structured customer intake forms with issue classification and tracking.
user-invocable: true
---

# Customer Intake Form

## Purpose
Help the team create structured customer intake reports.
Track customer details, issue classification, and resolution status.

## Intake Format

When a team member wants to log a customer intake, collect:
1. **Customer name** — who is the customer
2. **Date** — when the intake occurred (default to today)
3. **Issue category** — e.g., Technical, Billing, Feature Request
4. **Priority** — Low, Medium, High, Critical
5. **Description** — detailed description of the issue
6. **Steps taken** — any troubleshooting already attempted
7. **Notes** — additional context, timeline, etc.

Format the report as:

\`\`\`
INTAKE REPORT — {{customer_name}}
Date: {{date}}
Category: {{category}} | Priority: {{priority}}

DESCRIPTION:
  {{description}}

STEPS TAKEN:
  {{steps_taken}}

NOTES:
  {{notes}}
\`\`\`

## When Asked for a Summary
Provide a summary across all intake reports, noting trends in issue categories and resolution rates.
`,
  },
  {
    id: "budget-tracker",
    name: "Budget Tracker",
    category: "financial",
    description: "Track project or department budget allocations and spending",
    icon: "Calculator",
    prompt_hint: "Include per-category cost breakdown, comparison across projects, and total budget summary",
    starter_skill_md: `---
name: custom-budget-tracker
description: Track and calculate budget allocations and spending by category.
user-invocable: true
---

# Budget Tracker

## Purpose
Help the team track and calculate budget allocations and spending.
Break down costs by category for projects, departments, or initiatives.

## Budget Categories

### Personnel
- Role / position
- Hours allocated
- Rate per hour
- Duration

### Tools & Services
- Service name (e.g., SaaS subscriptions, hosting)
- Monthly or annual cost
- Number of seats / units

### Contractors
- Vendor name
- Scope of work
- Cost per deliverable or hourly rate

### Other
- Travel and expenses
- Training and development
- Miscellaneous costs

## Budget Summary Format

\`\`\`
BUDGET — {{project_name}}
Period: {{period}}

PERSONNEL:   \${{personnel_amount}}   ({{personnel_pct}}%)
TOOLS:       \${{tools_amount}}       ({{tools_pct}}%)
CONTRACTORS: \${{contractors_amount}} ({{contractors_pct}}%)
OTHER:       \${{other_amount}}       ({{other_pct}}%)
─────────────────────────────────────────
TOTAL:       \${{grand_total}}
REMAINING:   \${{remaining}}
\`\`\`

## Burn Rate
When the user provides a timeline and total budget, calculate the burn rate:
- Monthly burn = Total spent / Months elapsed
- Projected total = Monthly burn × Total months
`,
  },
  {
    id: "project-status-tracker",
    name: "Project Status Tracker",
    category: "project-management",
    description: "Log and track project milestones, deliverables, and status updates",
    icon: "BarChart3",
    prompt_hint: "Include milestone tracking, status updates, and timeline comparison",
    starter_skill_md: `---
name: custom-project-status-tracker
description: Log project milestones and track status across the team.
user-invocable: true
---

# Project Status Tracker

## Purpose
Help the team log project milestones, track deliverables, and provide
status summaries across active projects.

## Data Collection

When the user reports a project update, collect:
1. **Project name**
2. **Milestone / deliverable**
3. **Date**
4. **Status** — Not Started, In Progress, Blocked, Complete
5. **Owner** — who is responsible
6. **Completion %**
7. **Notes** — blockers, dependencies, next steps

## Status Log Format

\`\`\`
PROJECT UPDATE — {{project_name}}
Date: {{date}} | Milestone: {{milestone}}
Owner: {{owner}}
Status: {{status}} | Progress: {{completion_pct}}%
Notes: {{notes}}
\`\`\`

## Project Summary

When asked for a project summary, provide:
- Total milestones by status
- Overdue items
- Upcoming deadlines
- Team workload distribution
- Risk areas and blockers
`,
  },
  {
    id: "meeting-notes",
    name: "Meeting Notes",
    category: "productivity",
    description: "Structured meeting notes with action items and follow-ups",
    icon: "Wrench",
    prompt_hint: "Include attendee tracking, action item extraction, and follow-up reminders",
    starter_skill_md: `---
name: custom-meeting-notes
description: Record structured meeting notes with action items and follow-ups.
user-invocable: true
---

# Meeting Notes

## Purpose
Help the team capture structured meeting notes, extract action items,
and track follow-ups across recurring meetings.

## Meeting Entry

When the user wants to log meeting notes, collect:
1. **Meeting name** — e.g., Weekly standup, Client sync
2. **Date** — when the meeting occurred (default to today)
3. **Attendees** — who was present
4. **Agenda items** — topics discussed
5. **Decisions made** — key decisions and rationale
6. **Action items** — tasks assigned with owners and due dates
7. **Notes** — additional context

## Meeting Format

\`\`\`
MEETING NOTES — {{meeting_name}}
Date: {{date}}
Attendees: {{attendees}}

AGENDA:
  {{agenda_items}}

DECISIONS:
  {{decisions}}

ACTION ITEMS:
  {{action_items}}

NOTES:
  {{notes}}
\`\`\`

## Follow-Up Tracking

When asked, show all open action items from recent meetings, grouped by owner and sorted by due date.
`,
  },
  {
    id: "team-standup",
    name: "Team Standup Reporter",
    category: "productivity",
    description: "Daily standup collection and team status summaries",
    icon: "FileText",
    prompt_hint: "Include daily status collection, blocker tracking, and weekly summary",
    starter_skill_md: `---
name: custom-team-standup
description: Collect daily standup updates and generate team status summaries.
user-invocable: true
---

# Team Standup Reporter

## Purpose
Help the team collect and organize daily standup updates.
Track progress, blockers, and generate weekly summaries.

## Standup Entry

When a team member shares their update, collect:
1. **Name** — team member
2. **Date** (default today)
3. **Yesterday** — what they completed
4. **Today** — what they plan to work on
5. **Blockers** — anything preventing progress

## Standup Format

\`\`\`
STANDUP — {{name}}
Date: {{date}}

DONE:
  {{yesterday}}

PLANNED:
  {{today}}

BLOCKERS:
  {{blockers}}
\`\`\`

## Weekly Summary

When asked for a weekly summary, provide:
- Completed items per team member
- Recurring blockers
- Overall team velocity trends
- Items that carried over multiple days
`,
  },
  {
    id: "activity-log",
    name: "Activity Log",
    category: "operations",
    description: "Structured activity observations organized by topic and date",
    icon: "NotebookPen",
    prompt_hint: "Include structured note-taking, topic tagging, and timeline views",
    starter_skill_md: `---
name: custom-activity-log
description: Record structured activity logs organized by topic, date, and category.
user-invocable: true
---

# Activity Log

## Purpose
Help the team keep organized activity logs throughout the week.
Entries are tagged by topic, date, and category for easy recall.

## Log Categories
- **Task** — work completed, deliverables finished
- **Decision** — choices made, rationale noted
- **Issue** — problems encountered, incidents
- **Communication** — key emails, calls, messages
- **Review** — code reviews, document reviews, approvals
- **General** — miscellaneous notes

## Log Entry

When the user shares an activity, record:
1. **Topic**
2. **Date** (default today)
3. **Category**
4. **Content**

## Log Format

\`\`\`
ACTIVITY LOG — {{topic}}
Date: {{date}} | Category: {{category}}

{{content}}
\`\`\`

## Recall

When the user asks about a topic:
- Search previous logs by topic
- Filter by category or date range
- Show chronological timeline of activity

## Weekly Timeline

When asked for a weekly summary, present all logs in chronological order, grouped by day.
`,
  },
  {
    id: "metric-alert",
    name: "Metric Alert Watcher",
    category: "operations",
    description: "Custom threshold alerts and metric monitoring notifications",
    icon: "Bell",
    prompt_hint: "Include threshold alerts, trend monitoring, and daily metric summary",
    starter_skill_md: `---
name: custom-metric-alert
description: Set custom threshold alerts and monitor key metrics.
user-invocable: true
---

# Metric Alert Watcher

## Purpose
Help the team set and manage threshold alerts for key metrics.
Notify when metrics cross configured thresholds.

## Alert Setup

When the user wants to set an alert, collect:
1. **Metric name** — e.g., Response time, Error rate, Revenue
2. **Direction** — Above or Below
3. **Threshold value** — the target number
4. **Alert type** — Instant, Rolling average, Daily check
5. **Notes** — why this threshold matters (e.g., "SLA breach", "budget limit")

## Alert Format

\`\`\`
ALERT SET
{{metric_name}} {{direction}} {{threshold_value}}
Type: {{alert_type}}
Notes: {{notes}}
\`\`\`

## Alert Triggered

\`\`\`
ALERT TRIGGERED
{{metric_name}} is now {{current_value}} ({{direction}} your threshold of {{threshold_value}})
Change: {{change_amount}} ({{change_percent}}%)
Note: "{{notes}}"
\`\`\`

## Active Alerts Summary

When asked to show active alerts, list all configured alerts with current values and distance from threshold.

## Daily Metric Summary

When asked or on schedule, provide a summary of watched metrics with current values and trend direction.
`,
  },
];

export function getTemplateById(id: string): SkillTemplate | undefined {
  return SKILL_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: string): SkillTemplate[] {
  return SKILL_TEMPLATES.filter((t) => t.category === category);
}

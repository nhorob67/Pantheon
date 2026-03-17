# Operator Runbook: Browser Automation Troubleshooting

## Session Failures

### Session quota exceeded
**Symptom:** `quota_exceeded` error on browser_navigate
**Cause:** Tenant has exceeded their daily browser session limit
**Fix:**
1. Check the tenant's current session count for the day
2. If legitimate, increase the session quota
3. If suspicious, investigate which agent is creating sessions

### Session creation failure
**Symptom:** `session_error` on any browser action
**Cause:** Browser infrastructure issue (Playwright, container, network)
**Steps:**
1. Check if browser service is healthy
2. Check for resource exhaustion (memory, connections)
3. Try replaying the run — transient failures often resolve

## Budget Exhaustion

### Browser action budget
**Symptom:** `budget_browser_actions` guardrail halt
**Cause:** Agent performed too many browser actions (default: 25)
**Fix:**
1. Review the run's tool invocations — is the agent clicking randomly?
2. If the use case needs more actions, increase `max_browser_actions` via guardrail config
3. If the agent is stuck, improve its skill/prompt to be more targeted

### Browser no-progress halt
**Symptom:** `browser_no_progress` guardrail halt
**Cause:** Agent clicked/typed repeatedly with no page state change
**Fix:**
1. Check the page URL and snapshot in the run trace
2. Common cause: agent trying to interact with an element that doesn't exist or isn't interactive
3. Improve the agent's instructions to verify element existence before clicking

## SSRF Blocks

### Private IP blocked
**Symptom:** Navigation blocked with SSRF error
**Cause:** URL resolves to a private IP range (10.x, 172.16-31.x, 192.168.x)
**Fix:** This is a security feature — agents should not access internal networks. If the target is legitimately external, check DNS resolution.

### Auth URL blocked
**Symptom:** Navigation blocked on login/auth pages
**Cause:** URL matches auth patterns (/login, /signin, /auth, /oauth)
**Fix:** This is intentional — agents should not enter credentials. If the page is not actually an auth page, consider adjusting the URL pattern.

### Metadata endpoint blocked
**Symptom:** Navigation to 169.254.169.254 or metadata.google.internal blocked
**Fix:** This is critical cloud security protection — never override.

## Sensitive Field Detection

### Password/card/SSN field blocked
**Symptom:** browser_fill returns `sensitive_field` error
**Cause:** Field description matches sensitive patterns (password, credit card, SSN, etc.)
**Fix:** This is a safety feature. Agents should never auto-fill sensitive fields.

## Artifact Retrieval

### Viewing screenshots
1. Open the run in the run inspector
2. Expand the **Browser Sessions** section
3. Click the artifacts button to load screenshots
4. Screenshots are served from signed storage URLs (expire after 1 hour)

### Missing artifacts
**Symptom:** Artifact count > 0 but no images load
**Steps:**
1. Check if storage bucket is accessible
2. Check if signed URL generation is working
3. Try refreshing — URLs may have expired

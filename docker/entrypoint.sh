#!/bin/bash
set -eo pipefail

# Decode base64 env vars into config files
if [ -n "$OPENCLAW_CONFIG" ]; then
  echo "$OPENCLAW_CONFIG" | base64 -d > /home/node/.openclaw/openclaw.json
fi

if [ -n "$SOUL_MD" ]; then
  echo "$SOUL_MD" | base64 -d > /home/node/.openclaw/SOUL.md
fi

# Decode per-agent soul files (multi-agent mode)
if [ -n "$SOUL_FILES" ]; then
  mkdir -p /home/node/.openclaw/souls
  echo "$SOUL_FILES" | base64 -d | node -e "
    const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    for (const [key, content] of Object.entries(data)) {
      require('fs').writeFileSync('/home/node/.openclaw/souls/' + key + '.md', content);
    }"
fi

# Decode custom skills
if [ -n "$CUSTOM_SKILLS" ]; then
  echo "$CUSTOM_SKILLS" | base64 -d | node -e "
    const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const fs = require('fs');
    const path = require('path');
    for (const [slug, skill] of Object.entries(data)) {
      const dir = path.join('/home/node/.openclaw/skills', slug);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'SKILL.md'), skill.skill_md);
      if (skill.references && Object.keys(skill.references).length > 0) {
        const refsDir = path.join(dir, 'references');
        fs.mkdirSync(refsDir, { recursive: true });
        for (const [name, content] of Object.entries(skill.references)) {
          fs.writeFileSync(path.join(refsDir, name), content);
        }
      }
    }"
fi

# Decode knowledge files
if [ -n "$KNOWLEDGE_FILES" ]; then
  echo "$KNOWLEDGE_FILES" | base64 -d | node -e "
    const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const fs = require('fs');
    const path = require('path');

    // Shared knowledge
    if (data.shared) {
      const dir = '/home/node/knowledge/shared';
      fs.mkdirSync(dir, { recursive: true });
      for (const [name, content] of Object.entries(data.shared)) {
        fs.writeFileSync(path.join(dir, name), content);
      }
    }

    // Per-agent knowledge
    if (data.agents) {
      for (const [agentKey, files] of Object.entries(data.agents)) {
        const dir = path.join('/home/node/knowledge/agents', agentKey);
        fs.mkdirSync(dir, { recursive: true });
        for (const [name, content] of Object.entries(files)) {
          fs.writeFileSync(path.join(dir, name), content);
        }
      }
    }"
fi

# Lock down config directory and file permissions
chmod 700 /home/node/.openclaw
find /home/node/.openclaw -type f -exec chmod 600 {} +

# Clear decoded config env vars so they're not readable via /proc/1/environ
unset OPENCLAW_CONFIG SOUL_MD SOUL_FILES CUSTOM_SKILLS KNOWLEDGE_FILES 2>/dev/null || true

# Ensure workspace and data directories exist
mkdir -p /home/node/workspace
mkdir -p /home/node/data

# Ensure local vault path exists for hybrid memory mode
VAULT_PATH="${FARMCLAW_VAULT_PATH:-/home/node/.openclaw/vault}"
mkdir -p "$VAULT_PATH"
chmod 700 "$VAULT_PATH"

# Optional bootstrap if clawvault CLI is available in the image
if [ "${FARMCLAW_MEMORY_MODE}" = "hybrid_local_vault" ] && command -v clawvault >/dev/null 2>&1; then
  clawvault init --vault "$VAULT_PATH" >/dev/null 2>&1 || true
fi

# Initialize scale tickets SQLite DB if skill is present
if [ -d "/home/node/.openclaw/skills/farm-scale-tickets" ] && [ -f "/home/node/.openclaw/skills/farm-scale-tickets/scripts/init_db.sh" ]; then
  bash /home/node/.openclaw/skills/farm-scale-tickets/scripts/init_db.sh
fi

# Start OpenClaw gateway
exec openclaw gateway --port 18789

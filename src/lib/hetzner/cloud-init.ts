interface CloudInitOptions {
  bootToken: string;
  apiBaseUrl: string;
}

/**
 * Builds a cloud-init script that provisions a Hetzner VPS with:
 * - Security hardening (SSH, fail2ban, UFW, unattended upgrades)
 * - Docker on a LUKS-encrypted volume (passphrase fetched via boot-key API)
 * - Encrypted swap (random key per boot via dm-crypt)
 *
 * The boot token is interpolated into the script — the LUKS passphrase
 * is never present in Hetzner user_data.
 */
export function buildCloudInitScript({ bootToken, apiBaseUrl }: CloudInitOptions): string {
  return `#!/bin/bash
set -euo pipefail

# ── 1. UTC timezone ──
timedatectl set-timezone UTC

# ── 2. Install security packages + cryptsetup ──
apt-get update -y
apt-get install -y ufw fail2ban unattended-upgrades cryptsetup

# ── 3. Unattended security upgrades ──
cat > /etc/apt/apt.conf.d/20auto-upgrades << 'AUTOUPGRADE'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
AUTOUPGRADE

# ── 4. SSH hardening ──
sed -i 's/^#\\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i 's/^#\\?MaxAuthTries.*/MaxAuthTries 3/' /etc/ssh/sshd_config
systemctl restart sshd

# ── 5. Fail2ban for SSH ──
cat > /etc/fail2ban/jail.local << 'JAIL'
[sshd]
enabled = true
port = ssh
filter = sshd
maxretry = 5
bantime = 3600
findtime = 600
JAIL
systemctl enable fail2ban
systemctl restart fail2ban

# ── 6. UFW firewall ──
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw --force enable

# ── 7. Install Docker (don't start yet — need LUKS volume first) ──
curl -fsSL https://get.docker.com | sh
systemctl enable docker

# ── 8. Fetch LUKS passphrase from boot-key API ──
BOOT_TOKEN="${bootToken}"
API_URL="${apiBaseUrl}/api/instances/boot-key"
LUKS_PASSPHRASE=""

for attempt in $(seq 1 10); do
  RESPONSE=$(curl -sf -X POST "$API_URL" \\
    -H "Content-Type: application/json" \\
    -d "{\\"boot_token\\": \\"$BOOT_TOKEN\\"}" 2>/dev/null) || true

  if [ -n "$RESPONSE" ]; then
    LUKS_PASSPHRASE=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('passphrase',''))" 2>/dev/null) || true
    if [ -n "$LUKS_PASSPHRASE" ]; then
      break
    fi
  fi

  DELAY=$((attempt * attempt * 2))
  echo "Boot-key fetch attempt $attempt failed, retrying in \${DELAY}s..."
  sleep "$DELAY"
done

if [ -z "$LUKS_PASSPHRASE" ]; then
  echo "FATAL: Failed to fetch LUKS passphrase after 10 attempts" >&2
  exit 1
fi

# Clear boot token from memory
BOOT_TOKEN=$(head -c 64 /dev/urandom | base64)
unset BOOT_TOKEN

# ── 9. LUKS-encrypt Docker storage ──
fallocate -l 20G /var/lib/docker-crypt.img
LOOP_DEV=$(losetup --find --show /var/lib/docker-crypt.img)

echo -n "$LUKS_PASSPHRASE" | cryptsetup luksFormat --batch-mode "$LOOP_DEV" -
echo -n "$LUKS_PASSPHRASE" | cryptsetup luksOpen "$LOOP_DEV" docker-crypt -

# Overwrite passphrase variable with random bytes, then unset
LUKS_PASSPHRASE=$(head -c 128 /dev/urandom | base64)
unset LUKS_PASSPHRASE

mkfs.ext4 /dev/mapper/docker-crypt
mount /dev/mapper/docker-crypt /var/lib/docker

# ── 10. Docker daemon config (log rotation) ──
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'DOCKERCFG'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
DOCKERCFG

# ── 11. Start Docker on encrypted mount ──
systemctl start docker

# ── 12. Encrypted swap (random key per boot — data unrecoverable after power-off) ──
fallocate -l 1G /cryptswap.img
chmod 600 /cryptswap.img

# Set up dm-crypt swap with random key
echo "cryptswap /cryptswap.img /dev/urandom swap,cipher=aes-xts-plain64,size=256" >> /etc/crypttab
echo "/dev/mapper/cryptswap none swap sw 0 0" >> /etc/fstab

# Activate for this boot
cryptdisks_start cryptswap 2>/dev/null || true
mkswap /dev/mapper/cryptswap 2>/dev/null || true
swapon /dev/mapper/cryptswap 2>/dev/null || true
`;
}

#!/bin/bash
# ============================================================
# AgriVision Hub Self-Update
# Checks cloud for new hub software version, downloads + applies
# Runs weekly via cron (Sunday 3:00 AM)
# ============================================================

AGRI_HOME="/home/agrivision"
CONF="$AGRI_HOME/config/agrivision.conf"
LOG="$AGRI_HOME/logs/update.log"
CURRENT_VERSION="3.0.0"

source "$CONF" 2>/dev/null

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG"; }

log "Checking for updates... (current: v${CURRENT_VERSION})"

# Check cloud for latest version
RESPONSE=$(curl -s -m 15 "${CLOUD_API_URL}/api/hub/version" \
    -H "Authorization: Bearer ${CLOUD_API_KEY}" \
    -H "X-Hub-Serial: ${HUB_SERIAL}" 2>/dev/null)

if [ -z "$RESPONSE" ]; then
    log "WARN: Could not reach update server"
    exit 0
fi

LATEST=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('version',''))" 2>/dev/null)
DOWNLOAD_URL=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('url',''))" 2>/dev/null)

if [ -z "$LATEST" ] || [ "$LATEST" = "$CURRENT_VERSION" ]; then
    log "OK: Already up to date (v${CURRENT_VERSION})"
    exit 0
fi

log "New version available: v${LATEST}"

# Download update package
TMP_DIR=$(mktemp -d)
UPDATE_FILE="$TMP_DIR/agrivision-update.tar.gz"

curl -s -o "$UPDATE_FILE" "$DOWNLOAD_URL" 2>/dev/null
if [ ! -f "$UPDATE_FILE" ]; then
    log "ERROR: Download failed"
    rm -rf "$TMP_DIR"
    exit 1
fi

# Verify checksum
EXPECTED_SHA=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('sha256',''))" 2>/dev/null)
ACTUAL_SHA=$(sha256sum "$UPDATE_FILE" | cut -d' ' -f1)

if [ -n "$EXPECTED_SHA" ] && [ "$EXPECTED_SHA" != "$ACTUAL_SHA" ]; then
    log "ERROR: Checksum mismatch! Aborting."
    rm -rf "$TMP_DIR"
    exit 1
fi

# Create rollback snapshot
log "Creating rollback snapshot..."
tar czf "$AGRI_HOME/backups/rollback_v${CURRENT_VERSION}_$(date +%Y%m%d).tar.gz" \
    -C "$AGRI_HOME" main.py services/ config/settings.py requirements.txt 2>/dev/null

# Stop hub, apply update, restart
log "Applying update v${LATEST}..."
systemctl stop agrivision-hub

tar xzf "$UPDATE_FILE" -C "$AGRI_HOME" --overwrite 2>/dev/null

# Update dependencies if requirements changed
source "$AGRI_HOME/venv/bin/activate"
pip install -q -r "$AGRI_HOME/requirements.txt" 2>/dev/null

systemctl start agrivision-hub
sleep 5

if systemctl is-active --quiet agrivision-hub; then
    log "SUCCESS: Updated to v${LATEST}"
    # Report to cloud
    curl -s -X POST "${CLOUD_API_URL}/api/hub/report-update" \
        -H "Authorization: Bearer ${CLOUD_API_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"hub_serial\":\"${HUB_SERIAL}\",\"version\":\"${LATEST}\",\"status\":\"success\"}" 2>/dev/null
else
    log "ERROR: Hub failed after update — rolling back..."
    tar xzf "$AGRI_HOME/backups/rollback_v${CURRENT_VERSION}_$(date +%Y%m%d).tar.gz" -C "$AGRI_HOME" 2>/dev/null
    systemctl start agrivision-hub
    log "Rolled back to v${CURRENT_VERSION}"
fi

rm -rf "$TMP_DIR"

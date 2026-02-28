#!/bin/bash
# ============================================================
# AgriVision Daily Backup
# Backs up database + config to /home/agrivision/backups/
# Runs daily via cron at 2:00 AM
# ============================================================

AGRI_HOME="/home/agrivision"
BACKUP_DIR="$AGRI_HOME/backups"
DATE=$(date +%Y%m%d)
MAX_BACKUPS=14  # Keep 2 weeks

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting daily backup..."

# Backup SQLite database
if [ -f "$AGRI_HOME/data/hub.db" ]; then
    sqlite3 "$AGRI_HOME/data/hub.db" ".backup '$BACKUP_DIR/hub_${DATE}.db'"
    gzip -f "$BACKUP_DIR/hub_${DATE}.db"
    echo "  ✅ Database backed up"
fi

# Backup config
tar czf "$BACKUP_DIR/config_${DATE}.tar.gz" -C "$AGRI_HOME" config/ 2>/dev/null
echo "  ✅ Config backed up"

# Backup fleet state
if [ -f "$AGRI_HOME/data/fleet_state.json" ]; then
    cp "$AGRI_HOME/data/fleet_state.json" "$BACKUP_DIR/fleet_${DATE}.json"
    echo "  ✅ Fleet state backed up"
fi

# Cleanup old backups
cd "$BACKUP_DIR"
ls -t hub_*.db.gz 2>/dev/null | tail -n +$((MAX_BACKUPS+1)) | xargs rm -f
ls -t config_*.tar.gz 2>/dev/null | tail -n +$((MAX_BACKUPS+1)) | xargs rm -f
ls -t fleet_*.json 2>/dev/null | tail -n +$((MAX_BACKUPS+1)) | xargs rm -f

TOTAL=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "  📦 Total backup size: $TOTAL"
echo "[$(date)] Backup complete"

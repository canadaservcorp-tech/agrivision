#!/bin/bash
# ============================================================
# AgriVision Watchdog — Hub Health Monitor
# Runs every 5 minutes via systemd timer
# ============================================================

AGRI_HOME="/home/agrivision"
LOG="$AGRI_HOME/logs/watchdog.log"
CONF="$AGRI_HOME/config/agrivision.conf"
MAX_CPU_TEMP=80  # °C — throttle alert
MAX_MEM_PERCENT=90
MAX_DISK_PERCENT=90
MAX_LOG_SIZE_MB=50

timestamp() { date "+%Y-%m-%d %H:%M:%S"; }
log() { echo "[$(timestamp)] $1" >> "$LOG"; }

# ── 1. Check hub service ──
if ! systemctl is-active --quiet agrivision-hub; then
    log "CRITICAL: Hub service is DOWN. Restarting..."
    systemctl restart agrivision-hub
    sleep 5
    if systemctl is-active --quiet agrivision-hub; then
        log "OK: Hub restarted successfully"
    else
        log "FATAL: Hub failed to restart!"
    fi
else
    log "OK: Hub service is running"
fi

# ── 2. Check WiFi AP ──
if ! systemctl is-active --quiet hostapd; then
    log "WARN: hostapd is down. Restarting..."
    systemctl restart hostapd
fi

# ── 3. CPU temperature ──
CPU_TEMP=$(cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null)
if [ -n "$CPU_TEMP" ]; then
    TEMP_C=$((CPU_TEMP / 1000))
    if [ "$TEMP_C" -ge "$MAX_CPU_TEMP" ]; then
        log "WARN: CPU temperature ${TEMP_C}°C exceeds ${MAX_CPU_TEMP}°C"
    else
        log "OK: CPU temp ${TEMP_C}°C"
    fi
fi

# ── 4. Memory usage ──
MEM_USED=$(free | awk '/Mem:/{printf "%.0f", $3/$2 * 100}')
if [ "$MEM_USED" -ge "$MAX_MEM_PERCENT" ]; then
    log "WARN: Memory usage ${MEM_USED}% exceeds ${MAX_MEM_PERCENT}%"
    # Clear Python cache
    find /tmp -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null
else
    log "OK: Memory ${MEM_USED}%"
fi

# ── 5. Disk usage ──
DISK_USED=$(df -h "$AGRI_HOME" | awk 'NR==2{gsub("%",""); print $5}')
if [ "$DISK_USED" -ge "$MAX_DISK_PERCENT" ]; then
    log "WARN: Disk usage ${DISK_USED}% — cleaning old images..."
    # Delete images older than retention period
    find "$AGRI_HOME/data/images" -type f -name "*.jpg" -mtime +30 -delete
    # Delete old synced images
    find "$AGRI_HOME/data/images/synced" -type f -mtime +7 -delete 2>/dev/null
    AFTER=$(df -h "$AGRI_HOME" | awk 'NR==2{print $5}')
    log "OK: Disk cleaned: ${DISK_USED}% → ${AFTER}"
else
    log "OK: Disk ${DISK_USED}%"
fi

# ── 6. Log rotation ──
for logfile in "$AGRI_HOME"/logs/*.log; do
    if [ -f "$logfile" ]; then
        SIZE_MB=$(du -m "$logfile" 2>/dev/null | cut -f1)
        if [ "${SIZE_MB:-0}" -ge "$MAX_LOG_SIZE_MB" ]; then
            mv "$logfile" "${logfile}.$(date +%Y%m%d)"
            gzip "${logfile}.$(date +%Y%m%d)"
            log "OK: Rotated $(basename $logfile) (${SIZE_MB}MB)"
            # Keep only last 5 compressed logs
            ls -t "${logfile}".*.gz 2>/dev/null | tail -n +6 | xargs rm -f
        fi
    fi
done

# ── 7. Check camera receiver port ──
if ! ss -tlnp | grep -q ":8080"; then
    log "WARN: Camera receiver port 8080 not listening"
fi

# ── 8. Count connected cameras ──
CONNECTED=$(iw dev wlan0 station dump 2>/dev/null | grep -c "Station")
log "INFO: ${CONNECTED} WiFi clients connected"

# ── 9. Check internet connectivity ──
if ping -c 1 -W 3 8.8.8.8 > /dev/null 2>&1; then
    log "OK: Internet connected"
else
    log "WARN: No internet — cloud sync paused"
fi

# ── 10. Uptime ──
UPTIME=$(uptime -p)
log "INFO: System $UPTIME"

# Trim watchdog log to last 1000 lines
tail -1000 "$LOG" > "${LOG}.tmp" && mv "${LOG}.tmp" "$LOG"

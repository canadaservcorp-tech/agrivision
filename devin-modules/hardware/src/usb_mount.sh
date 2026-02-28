#!/bin/bash
# /etc/udev/rules.d/99-agrivision-usb.rules
# Auto-mount external USB drive for CCTV recording
#
# Install:
#   sudo cp 99-agrivision-usb.rules /etc/udev/rules.d/
#   sudo cp usb_mount.sh /usr/local/bin/
#   sudo chmod +x /usr/local/bin/usb_mount.sh
#   sudo udevadm control --reload-rules
#
# Udev rule content (save as /etc/udev/rules.d/99-agrivision-usb.rules):
# ACTION=="add", SUBSYSTEM=="block", ENV{ID_FS_TYPE}!="", RUN+="/usr/local/bin/usb_mount.sh add %k"
# ACTION=="remove", SUBSYSTEM=="block", RUN+="/usr/local/bin/usb_mount.sh remove %k"

MOUNT_POINT="/mnt/usb_drive"
CCTV_DIR="$MOUNT_POINT/agrivision_cctv"
LOG="/var/log/agrivision/usb_mount.log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"
}

case "$1" in
    add)
        DEVICE="/dev/$2"
        log "USB device detected: $DEVICE"

        # Create mount point
        mkdir -p "$MOUNT_POINT"

        # Try to mount (ext4 first, then ntfs, then vfat)
        if mount -t ext4 "$DEVICE" "$MOUNT_POINT" 2>/dev/null; then
            log "Mounted $DEVICE as ext4"
        elif mount -t ntfs-3g "$DEVICE" "$MOUNT_POINT" 2>/dev/null; then
            log "Mounted $DEVICE as NTFS"
        elif mount -t vfat "$DEVICE" "$MOUNT_POINT" -o uid=1000,gid=1000 2>/dev/null; then
            log "Mounted $DEVICE as FAT32"
        else
            log "Failed to mount $DEVICE"
            exit 1
        fi

        # Create CCTV directory structure
        mkdir -p "$CCTV_DIR"

        # Log drive stats
        CAPACITY=$(df -BG "$MOUNT_POINT" | tail -1 | awk '{print $2}')
        USED=$(df -BG "$MOUNT_POINT" | tail -1 | awk '{print $3}')
        AVAIL=$(df -BG "$MOUNT_POINT" | tail -1 | awk '{print $4}')
        log "Drive: $CAPACITY total, $USED used, $AVAIL available"

        # Signal to agrivision that CCTV drive is ready
        touch /tmp/agrivision_cctv_ready
        ;;

    remove)
        log "USB device removed: /dev/$2"
        umount "$MOUNT_POINT" 2>/dev/null
        rm -f /tmp/agrivision_cctv_ready
        ;;
esac

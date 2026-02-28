#!/usr/bin/env python3
"""
Agrivision SD Card Software Update Module
==========================================
SD2 slot is dedicated to software updates.
On boot, system checks SD2 for update package.
If found: validates → backs up current → applies → reboots.
If not found: normal operation continues.

Update package format (on SD2 root):
  /agrivision-update/
    manifest.json        — version, checksums, changelog
    firmware.tar.gz      — compressed update files
    signature.sha256     — SHA-256 signature for integrity

Compatible with: Arducam 64MP Hawkeye (IMX682) · CM4 · LiFePO4 6Ah
"""

import os
import sys
import json
import shutil
import hashlib
import tarfile
import logging
import subprocess
from datetime import datetime
from pathlib import Path

# ============ Configuration ============

SD2_MOUNT = '/mnt/sd2'
SD2_DEVICE = '/dev/mmcblk0p1'  # SD2 slot device
UPDATE_DIR = f'{SD2_MOUNT}/agrivision-update'
MANIFEST_FILE = f'{UPDATE_DIR}/manifest.json'
FIRMWARE_FILE = f'{UPDATE_DIR}/firmware.tar.gz'
SIGNATURE_FILE = f'{UPDATE_DIR}/signature.sha256'

INSTALL_DIR = '/opt/agrivision'
BACKUP_DIR = '/var/agrivision/backups'
LOG_FILE = '/var/log/agrivision/update.log'
VERSION_FILE = '/opt/agrivision/VERSION'
UPDATE_HISTORY = '/var/agrivision/update_history.json'

# Status file written for mobile app to read
STATUS_FILE = '/var/agrivision/update_status.json'

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [UPDATE] %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE, mode='a'),
        logging.StreamHandler(),
    ]
)
log = logging.getLogger('updater')


def write_status(status: str, progress: float = 0, message: str = '', version: str = ''):
    """Write update status for mobile app API to read."""
    data = {
        'status': status,
        'progress': progress,
        'message': message,
        'version': version,
        'timestamp': datetime.now().isoformat(),
        'current_version': get_current_version(),
    }
    os.makedirs(os.path.dirname(STATUS_FILE), exist_ok=True)
    with open(STATUS_FILE, 'w') as f:
        json.dump(data, f)


def get_current_version() -> str:
    """Read current installed version."""
    try:
        with open(VERSION_FILE) as f:
            return f.read().strip()
    except FileNotFoundError:
        return '0.0.0'


def mount_sd2() -> bool:
    """Mount SD2 card if not already mounted."""
    if os.path.ismount(SD2_MOUNT):
        return True

    os.makedirs(SD2_MOUNT, exist_ok=True)

    # Try common device paths for SD2 slot
    devices = ['/dev/mmcblk0p1', '/dev/mmcblk1p1', '/dev/sda1']
    for dev in devices:
        if os.path.exists(dev):
            try:
                subprocess.run(
                    ['mount', '-t', 'auto', dev, SD2_MOUNT],
                    check=True, timeout=10, capture_output=True
                )
                log.info(f'SD2 mounted: {dev} → {SD2_MOUNT}')
                return True
            except subprocess.CalledProcessError:
                continue

    log.info('No SD2 card detected')
    return False


def check_for_update() -> dict:
    """Check if update package exists on SD2."""
    if not os.path.exists(MANIFEST_FILE):
        return None

    try:
        with open(MANIFEST_FILE) as f:
            manifest = json.load(f)

        required_fields = ['version', 'checksum_sha256', 'min_version', 'release_date']
        for field in required_fields:
            if field not in manifest:
                log.error(f'Manifest missing required field: {field}')
                return None

        # Check if newer than current
        current = get_current_version()
        if manifest['version'] <= current:
            log.info(f'Update {manifest["version"]} not newer than current {current}')
            return None

        # Check minimum version compatibility
        if current < manifest.get('min_version', '0.0.0'):
            log.error(f'Current {current} below minimum {manifest["min_version"]}')
            return None

        # Verify firmware file exists
        if not os.path.exists(FIRMWARE_FILE):
            log.error('Firmware file missing from SD2')
            return None

        log.info(f'Update found: v{manifest["version"]} (current: v{current})')
        return manifest

    except (json.JSONDecodeError, Exception) as e:
        log.error(f'Invalid manifest: {e}')
        return None


def verify_integrity(manifest: dict) -> bool:
    """Verify firmware file integrity using SHA-256 checksum."""
    write_status('verifying', 0.2, 'Verifying update integrity...')

    expected_hash = manifest['checksum_sha256']

    sha256 = hashlib.sha256()
    with open(FIRMWARE_FILE, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            sha256.update(chunk)

    actual_hash = sha256.hexdigest()

    if actual_hash != expected_hash:
        log.error(f'Checksum mismatch: expected {expected_hash}, got {actual_hash}')
        write_status('failed', 0, 'Integrity check failed — corrupted update')
        return False

    # Verify signature if present
    if os.path.exists(SIGNATURE_FILE):
        try:
            with open(SIGNATURE_FILE) as f:
                sig_hash = f.read().strip().split()[0]
            if sig_hash != actual_hash:
                log.error('Signature verification failed')
                write_status('failed', 0, 'Signature verification failed')
                return False
        except Exception as e:
            log.warning(f'Signature check error: {e}')

    log.info('Integrity verified ✓')
    return True


def create_backup() -> str:
    """Backup current installation before updating."""
    write_status('backing_up', 0.35, 'Creating backup...')

    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    current_version = get_current_version()
    backup_name = f'backup_v{current_version}_{timestamp}.tar.gz'
    backup_path = os.path.join(BACKUP_DIR, backup_name)

    try:
        with tarfile.open(backup_path, 'w:gz') as tar:
            tar.add(INSTALL_DIR, arcname='agrivision')

        # Keep only last 3 backups
        backups = sorted(Path(BACKUP_DIR).glob('backup_*.tar.gz'))
        for old in backups[:-3]:
            old.unlink()
            log.info(f'Removed old backup: {old.name}')

        backup_size = os.path.getsize(backup_path) // (1024 * 1024)
        log.info(f'Backup created: {backup_name} ({backup_size}MB)')
        return backup_path

    except Exception as e:
        log.error(f'Backup failed: {e}')
        write_status('failed', 0, f'Backup failed: {e}')
        return None


def apply_update(manifest: dict) -> bool:
    """Extract and apply firmware update."""
    write_status('installing', 0.5, f'Installing v{manifest["version"]}...')

    temp_dir = '/tmp/agrivision-update'

    try:
        # Clean temp
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        os.makedirs(temp_dir)

        # Extract firmware
        write_status('installing', 0.55, 'Extracting files...')
        with tarfile.open(FIRMWARE_FILE, 'r:gz') as tar:
            tar.extractall(temp_dir)

        # Run pre-install script if present
        pre_script = os.path.join(temp_dir, 'pre_install.sh')
        if os.path.exists(pre_script):
            write_status('installing', 0.6, 'Running pre-install...')
            subprocess.run(['bash', pre_script], check=True, timeout=60)

        # Copy files to installation directory
        write_status('installing', 0.65, 'Copying files...')

        update_src = os.path.join(temp_dir, 'agrivision')
        if os.path.isdir(update_src):
            # Merge update files into install dir
            for root, dirs, files in os.walk(update_src):
                rel_path = os.path.relpath(root, update_src)
                dest_dir = os.path.join(INSTALL_DIR, rel_path)
                os.makedirs(dest_dir, exist_ok=True)

                for file in files:
                    src = os.path.join(root, file)
                    dst = os.path.join(dest_dir, file)
                    shutil.copy2(src, dst)

        # Install Python dependencies if requirements.txt present
        req_file = os.path.join(temp_dir, 'requirements.txt')
        if os.path.exists(req_file):
            write_status('installing', 0.75, 'Installing dependencies...')
            subprocess.run(
                ['pip3', 'install', '-r', req_file, '--break-system-packages'],
                check=True, timeout=120, capture_output=True
            )

        # Install Node dependencies if package.json present
        pkg_file = os.path.join(temp_dir, 'package.json')
        if os.path.exists(pkg_file):
            write_status('installing', 0.8, 'Installing npm packages...')
            subprocess.run(
                ['npm', 'install', '--production'],
                cwd=INSTALL_DIR, check=True, timeout=120, capture_output=True
            )

        # Run database migrations if present
        migration_dir = os.path.join(temp_dir, 'migrations')
        if os.path.isdir(migration_dir):
            write_status('installing', 0.85, 'Running database migrations...')
            for sql_file in sorted(Path(migration_dir).glob('*.sql')):
                subprocess.run(
                    ['psql', '-U', 'agrivision', '-d', 'agrivision', '-f', str(sql_file)],
                    check=True, timeout=30, capture_output=True
                )

        # Run post-install script if present
        post_script = os.path.join(temp_dir, 'post_install.sh')
        if os.path.exists(post_script):
            write_status('installing', 0.9, 'Running post-install...')
            subprocess.run(['bash', post_script], check=True, timeout=60)

        # Update version file
        with open(VERSION_FILE, 'w') as f:
            f.write(manifest['version'])

        # Cleanup
        shutil.rmtree(temp_dir, ignore_errors=True)

        log.info(f'Update v{manifest["version"]} installed successfully')
        return True

    except Exception as e:
        log.error(f'Update installation failed: {e}')
        write_status('failed', 0, f'Installation failed: {e}')
        # Attempt rollback handled in main()
        return False


def rollback(backup_path: str):
    """Restore from backup after failed update."""
    write_status('rolling_back', 0, 'Rolling back to previous version...')
    log.warning('Rolling back update...')

    try:
        # Remove failed installation
        if os.path.exists(INSTALL_DIR):
            shutil.rmtree(INSTALL_DIR)

        # Restore backup
        with tarfile.open(backup_path, 'r:gz') as tar:
            tar.extractall('/')

        log.info('Rollback completed')
        write_status('rolled_back', 0, 'Update rolled back to previous version')

    except Exception as e:
        log.critical(f'ROLLBACK FAILED: {e}')
        write_status('critical', 0, f'Rollback failed: {e}')


def record_update(manifest: dict, success: bool):
    """Record update in history file."""
    history = []
    if os.path.exists(UPDATE_HISTORY):
        try:
            with open(UPDATE_HISTORY) as f:
                history = json.load(f)
        except:
            history = []

    history.append({
        'version': manifest['version'],
        'previous_version': manifest.get('previous_version', 'unknown'),
        'release_date': manifest.get('release_date'),
        'installed_at': datetime.now().isoformat(),
        'success': success,
        'changelog': manifest.get('changelog', ''),
    })

    # Keep last 20 entries
    history = history[-20:]

    with open(UPDATE_HISTORY, 'w') as f:
        json.dump(history, f, indent=2)


def mark_sd2_done():
    """Rename update dir on SD2 so it doesn't re-trigger on next boot."""
    try:
        done_dir = f'{SD2_MOUNT}/agrivision-update-applied-{datetime.now().strftime("%Y%m%d")}'
        os.rename(UPDATE_DIR, done_dir)
        log.info('Update package marked as applied on SD2')
    except Exception as e:
        log.warning(f'Could not mark SD2: {e}')


def unmount_sd2():
    """Safely unmount SD2."""
    try:
        subprocess.run(['umount', SD2_MOUNT], check=True, timeout=10, capture_output=True)
        log.info('SD2 unmounted')
    except:
        pass


# ============ MAIN ============

def main():
    """Check SD2 for update and apply if found."""
    log.info('=' * 40)
    log.info(f'Update checker started (current: v{get_current_version()})')

    write_status('checking', 0.05, 'Checking SD2 for updates...')

    # 1. Mount SD2
    if not mount_sd2():
        write_status('idle', 0, 'No SD2 card detected')
        return False

    # 2. Check for update
    manifest = check_for_update()
    if not manifest:
        write_status('idle', 0, 'No update available')
        unmount_sd2()
        return False

    write_status('found', 0.1, f'Update v{manifest["version"]} found', manifest['version'])
    log.info(f'Update v{manifest["version"]}: {manifest.get("changelog", "No changelog")}')

    # 3. Verify integrity
    if not verify_integrity(manifest):
        unmount_sd2()
        return False

    # 4. Create backup
    backup_path = create_backup()
    if not backup_path:
        unmount_sd2()
        return False

    # 5. Apply update
    success = apply_update(manifest)

    if success:
        write_status('completed', 1.0, f'Updated to v{manifest["version"]}', manifest['version'])
        record_update(manifest, True)
        mark_sd2_done()
        unmount_sd2()

        log.info(f'Update v{manifest["version"]} complete — rebooting in 5s...')
        subprocess.run(['sync'])
        subprocess.run(['sleep', '5'])
        subprocess.run(['sudo', 'reboot'])
    else:
        # Rollback
        rollback(backup_path)
        record_update(manifest, False)
        unmount_sd2()

    return success


if __name__ == '__main__':
    try:
        result = main()
        sys.exit(0 if result else 1)
    except Exception as e:
        log.critical(f'Update checker crashed: {e}')
        write_status('error', 0, f'Updater crashed: {e}')
        sys.exit(1)

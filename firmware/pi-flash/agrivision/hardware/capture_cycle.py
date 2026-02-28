#!/usr/bin/env python3
"""
Agrivision Wake-Capture-Sleep Controller
=========================================
Camera: Arducam 64MP Hawkeye (IMX682) — 24MP mode (6000×4000)
Cycle: RTC alarm → boot → capture photo → AI inference → upload → set next alarm → shutdown
Interval: Every 20 minutes
CCTV Mode: If external USB drive detected, also saves continuous recordings to drive

Power budget per cycle: ~0.095 Wh (55s active, 19m05s standby)
Photo size: ~7MB JPEG at 24MP
Internal battery 12V 6Ah = 57.6 Wh usable → ~8.4 days without solar
Daily storage: 72 photos × 7MB = ~504MB/day
"""

import os
import sys
import time
import json
import shutil
import logging
import subprocess
from datetime import datetime, timedelta
from pathlib import Path

# ============ Configuration ============

CAPTURE_INTERVAL_MIN = 20
PHOTO_DIR = '/var/agrivision/photos'
CACHE_DIR = '/var/agrivision/cache'
CCTV_MOUNT_POINT = '/mnt/usb_drive'
CCTV_RECORDING_DIR = f'{CCTV_MOUNT_POINT}/agrivision_cctv'
LOG_FILE = '/var/log/agrivision/capture.log'
CONFIG_FILE = '/etc/agrivision/config.json'
API_BASE = None  # Set from config
FARM_ID = None   # Set from config

# Camera settings for 24MP capture (Arducam 64MP Hawkeye in 24MP mode)
CAMERA_RESOLUTION = (6000, 4000)  # 24MP mode (64MP native: 9152×6944)
CAMERA_QUALITY = 90
THUMBNAIL_SIZE = (480, 320)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE, mode='a'),
        logging.StreamHandler(),
    ]
)
log = logging.getLogger('agrivision')


def load_config():
    """Load device configuration."""
    global API_BASE, FARM_ID
    try:
        with open(CONFIG_FILE) as f:
            config = json.load(f)
        API_BASE = config.get('api_base', 'https://api.agrivision.ca/api/v1')
        FARM_ID = config.get('farm_id')
        return config
    except Exception as e:
        log.error(f'Config load failed: {e}')
        return {}


def read_sensors():
    """Read all I2C sensors — quick snapshot during capture."""
    data = {
        'temperature': None, 'humidity': None, 'pressure': None,
        'soil_moisture': None, 'uv_index': None, 'light_level': None,
    }
    try:
        import board
        import busio
        i2c = busio.I2C(board.SCL, board.SDA)

        # BME280 — temp/humidity/pressure
        try:
            import adafruit_bme280.advanced as adafruit_bme280
            bme = adafruit_bme280.Adafruit_BME280_I2C(i2c, address=0x76)
            data['temperature'] = round(bme.temperature, 1)
            data['humidity'] = round(bme.humidity, 1)
            data['pressure'] = round(bme.pressure, 1)
        except Exception as e:
            log.warning(f'BME280 read failed: {e}')

        # ADS1115 — soil moisture ADC
        try:
            import adafruit_ads1x15.ads1115 as ADS
            from adafruit_ads1x15.analog_in import AnalogIn
            ads = ADS.ADS1115(i2c, address=0x48)
            chan = AnalogIn(ads, ADS.P0)
            # Convert voltage to moisture % (calibrated: dry=2.8V, wet=1.2V)
            moisture_pct = max(0, min(100, (2.8 - chan.voltage) / 1.6 * 100))
            data['soil_moisture'] = round(moisture_pct, 1)
        except Exception as e:
            log.warning(f'ADS1115 read failed: {e}')

        # VEML6075 — UV index
        try:
            import adafruit_veml6075
            veml = adafruit_veml6075.VEML6075(i2c)
            data['uv_index'] = round(veml.uv_index, 2)
        except Exception as e:
            log.warning(f'VEML6075 read failed: {e}')

        # BH1750 — light level
        try:
            import adafruit_bh1750
            bh = adafruit_bh1750.BH1750(i2c)
            data['light_level'] = round(bh.lux, 1)
        except Exception as e:
            log.warning(f'BH1750 read failed: {e}')

    except Exception as e:
        log.error(f'Sensor bus init failed: {e}')

    return data


def capture_photo():
    """Capture photo using libcamera-still (Pi Camera 3)."""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'agv_{FARM_ID}_{timestamp}.jpg'
    filepath = os.path.join(PHOTO_DIR, filename)
    thumb_path = os.path.join(PHOTO_DIR, f'thumb_{filename}')

    os.makedirs(PHOTO_DIR, exist_ok=True)

    try:
        # Full resolution capture — Arducam 64MP Hawkeye (24MP mode)
        # Mode 0 = 64MP (9152×6944), Mode 2 = 24MP (6000×4000), Mode 4 = 4K video
        cmd = [
            'libcamera-still',
            '-o', filepath,
            '--width', str(CAMERA_RESOLUTION[0]),
            '--height', str(CAMERA_RESOLUTION[1]),
            '-q', str(CAMERA_QUALITY),
            '--nopreview',
            '-t', '3000',  # 3s exposure stabilization (larger sensor needs more)
            '--immediate',
            '--autofocus-mode', 'auto',  # Arducam AF support
        ]
        subprocess.run(cmd, check=True, timeout=15, capture_output=True)

        # Generate thumbnail
        subprocess.run([
            'ffmpeg', '-y', '-i', filepath,
            '-vf', f'scale={THUMBNAIL_SIZE[0]}:{THUMBNAIL_SIZE[1]}',
            '-q:v', '5', thumb_path,
        ], check=True, timeout=5, capture_output=True)

        file_size_kb = os.path.getsize(filepath) // 1024
        log.info(f'Captured: {filename} ({file_size_kb} KB)')

        return filepath, thumb_path, filename, file_size_kb

    except Exception as e:
        log.error(f'Capture failed: {e}')
        return None, None, None, 0


def run_ai_inference(image_path):
    """Run TFLite disease detection on captured image.
    Note: 24MP (6000×4000) images are downscaled to 224×224 for inference.
    Higher source resolution provides better crop detail for detection accuracy.
    """
    try:
        import tflite_runtime.interpreter as tflite
        from PIL import Image
        import numpy as np

        model_path = '/var/agrivision/models/disease_detect.tflite'
        if not os.path.exists(model_path):
            log.warning('AI model not found, skipping inference')
            return False, None, 0, 0

        interpreter = tflite.Interpreter(model_path=model_path)
        interpreter.allocate_tensors()

        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()

        # Preprocess
        img = Image.open(image_path).resize((224, 224))
        input_data = np.expand_dims(np.array(img, dtype=np.float32) / 255.0, axis=0)

        start = time.time()
        interpreter.set_tensor(input_details[0]['index'], input_data)
        interpreter.invoke()
        inference_ms = int((time.time() - start) * 1000)

        output = interpreter.get_tensor(output_details[0]['index'])[0]
        disease_idx = np.argmax(output)
        confidence = float(output[disease_idx])

        # Labels (from training)
        labels = ['healthy', 'bacterial_spot', 'early_blight', 'late_blight',
                   'leaf_mold', 'septoria', 'spider_mites', 'target_spot',
                   'mosaic_virus', 'yellow_curl']

        has_disease = disease_idx > 0 and confidence > 0.7
        disease_type = labels[disease_idx] if has_disease else None

        log.info(f'AI: {labels[disease_idx]} ({confidence:.2%}) in {inference_ms}ms')
        return has_disease, disease_type, confidence, inference_ms

    except Exception as e:
        log.warning(f'AI inference failed: {e}')
        return False, None, 0, 0


def cache_result(photo_path, thumb_path, filename, file_size_kb, sensor_data, ai_result):
    """Cache photo + metadata locally for later upload."""
    os.makedirs(CACHE_DIR, exist_ok=True)
    has_disease, disease_type, confidence, inference_ms = ai_result

    entry = {
        'filename': filename,
        'photo_path': photo_path,
        'thumb_path': thumb_path,
        'file_size_kb': file_size_kb,
        'captured_at': datetime.now().isoformat(),
        'sensor_data': sensor_data,
        'has_disease_alert': has_disease,
        'disease_type': disease_type,
        'disease_confidence': confidence,
        'ai_inference_ms': inference_ms,
        'uploaded': False,
    }

    cache_file = os.path.join(CACHE_DIR, f'{filename}.json')
    with open(cache_file, 'w') as f:
        json.dump(entry, f)

    return entry


def upload_cached():
    """Try uploading any cached photos to backend."""
    if not API_BASE or not FARM_ID:
        return

    import requests

    cached = sorted(Path(CACHE_DIR).glob('*.json'))
    uploaded = 0

    for cache_file in cached[:10]:  # Max 10 per cycle to save time
        try:
            with open(cache_file) as f:
                entry = json.load(f)

            if entry.get('uploaded'):
                continue

            # Upload photo file
            with open(entry['photo_path'], 'rb') as img:
                upload_res = requests.post(
                    f'{API_BASE}/upload/photo',
                    files={'image': img},
                    timeout=15,
                )

            if upload_res.status_code != 200:
                continue

            image_url = upload_res.json().get('url')

            # Upload thumbnail
            thumb_url = None
            if entry.get('thumb_path') and os.path.exists(entry['thumb_path']):
                with open(entry['thumb_path'], 'rb') as thumb:
                    thumb_res = requests.post(
                        f'{API_BASE}/upload/photo',
                        files={'image': thumb},
                        timeout=10,
                    )
                if thumb_res.status_code == 200:
                    thumb_url = thumb_res.json().get('url')

            # Register in API
            res = requests.post(
                f'{API_BASE}/timelapse/{FARM_ID}/photos',
                json={
                    'image_url': image_url,
                    'thumbnail_url': thumb_url,
                    'temperature': entry['sensor_data'].get('temperature'),
                    'humidity': entry['sensor_data'].get('humidity'),
                    'has_disease_alert': entry.get('has_disease_alert', False),
                    'disease_type': entry.get('disease_type'),
                    'file_size_kb': entry.get('file_size_kb', 0),
                    'source': 'scheduled',
                },
                timeout=10,
            )

            if res.status_code == 201:
                entry['uploaded'] = True
                with open(cache_file, 'w') as f:
                    json.dump(entry, f)
                uploaded += 1

        except Exception as e:
            log.warning(f'Upload failed for {cache_file.name}: {e}')

    if uploaded:
        log.info(f'Uploaded {uploaded} cached photos')


def check_cctv_mode():
    """Check if external USB drive is connected for CCTV recording."""
    try:
        # Check if USB drive is mounted
        if os.path.ismount(CCTV_MOUNT_POINT):
            os.makedirs(CCTV_RECORDING_DIR, exist_ok=True)

            # Get drive stats
            stat = shutil.disk_usage(CCTV_MOUNT_POINT)
            capacity_gb = stat.total // (1024 ** 3)
            used_gb = stat.used // (1024 ** 3)

            log.info(f'CCTV drive detected: {capacity_gb}GB total, {used_gb}GB used')
            return True, capacity_gb, used_gb
        return False, 0, 0

    except Exception as e:
        log.warning(f'CCTV check failed: {e}')
        return False, 0, 0


def save_to_cctv_drive(photo_path, filename):
    """Copy photo to external USB drive for CCTV storage."""
    try:
        date_dir = datetime.now().strftime('%Y-%m-%d')
        dest_dir = os.path.join(CCTV_RECORDING_DIR, date_dir)
        os.makedirs(dest_dir, exist_ok=True)

        dest = os.path.join(dest_dir, filename)
        shutil.copy2(photo_path, dest)
        log.info(f'CCTV saved: {dest}')
        return True
    except Exception as e:
        log.error(f'CCTV save failed: {e}')
        return False


def set_next_alarm_and_shutdown():
    """Set RTC alarm for next capture and power off."""
    next_wake = datetime.now() + timedelta(minutes=CAPTURE_INTERVAL_MIN)

    try:
        # Set DS3231 RTC alarm (via i2c-tools)
        # Alarm 1: match minutes and seconds
        minute = next_wake.minute
        hour = next_wake.hour

        # Write alarm registers
        subprocess.run([
            'i2cset', '-y', '1', '0x68',
            '0x07', hex(int(f'{0:02d}', 16)),     # seconds = 0
            hex(int(f'{minute:02d}', 16)),          # minutes
            hex(int(f'{hour:02d}', 16)),             # hours
            '0x80',                                   # day (don't care)
        ], check=True, timeout=5)

        # Enable alarm interrupt
        subprocess.run([
            'i2cset', '-y', '1', '0x68', '0x0E', '0x05',
        ], check=True, timeout=5)

        # Clear alarm flag
        subprocess.run([
            'i2cset', '-y', '1', '0x68', '0x0F', '0x00',
        ], check=True, timeout=5)

        log.info(f'Next wake: {next_wake.strftime("%H:%M")}')

    except Exception as e:
        log.warning(f'RTC alarm set failed: {e}, using systemd timer fallback')
        # Fallback: use systemd timer (won't survive full power off)
        subprocess.run([
            'systemd-run', '--on-active', f'{CAPTURE_INTERVAL_MIN}m',
            sys.executable, __file__,
        ], capture_output=True)

    # Shutdown
    log.info('Shutting down...')
    time.sleep(1)
    subprocess.run(['sudo', 'shutdown', '-h', 'now'])


def cleanup_old_local_photos():
    """Remove uploaded photos older than 7 days from SD card."""
    try:
        cutoff = time.time() - (7 * 86400)
        removed = 0

        for cache_file in Path(CACHE_DIR).glob('*.json'):
            with open(cache_file) as f:
                entry = json.load(f)

            if entry.get('uploaded') and os.path.getmtime(str(cache_file)) < cutoff:
                # Remove photo, thumbnail, and cache file
                for p in [entry.get('photo_path'), entry.get('thumb_path')]:
                    if p and os.path.exists(p):
                        os.remove(p)
                cache_file.unlink()
                removed += 1

        if removed:
            log.info(f'Cleaned up {removed} old photos from SD')

    except Exception as e:
        log.warning(f'Cleanup failed: {e}')


# ============ MAIN CYCLE ============

def main():
    """Complete wake-capture-sleep cycle (~50 seconds active)."""
    cycle_start = time.time()
    log.info('=' * 50)
    log.info('WAKE — Starting capture cycle')

    # 1. Load config
    config = load_config()
    if not FARM_ID:
        log.error('No farm_id configured! Skipping cycle.')
        set_next_alarm_and_shutdown()
        return

    # 2. Read sensors (~2s)
    log.info('Reading sensors...')
    sensor_data = read_sensors()
    log.info(f'Sensors: {sensor_data["temperature"]}°C, {sensor_data["humidity"]}%, '
             f'soil: {sensor_data["soil_moisture"]}%')

    # 3. Capture photo (~5s)
    log.info('Capturing photo...')
    photo_path, thumb_path, filename, file_size_kb = capture_photo()

    if not photo_path:
        log.error('Photo capture failed, shutting down')
        set_next_alarm_and_shutdown()
        return

    # 4. AI inference (~10s)
    log.info('Running AI inference...')
    ai_result = run_ai_inference(photo_path)

    # 5. Cache locally
    entry = cache_result(photo_path, thumb_path, filename, file_size_kb, sensor_data, ai_result)

    # 6. Check CCTV mode — save to external drive if present
    cctv_detected, cctv_cap, cctv_used = check_cctv_mode()
    if cctv_detected:
        save_to_cctv_drive(photo_path, filename)

    # 7. Try uploading cached photos (~10s max)
    log.info('Uploading cached photos...')
    upload_cached()

    # 8. Cleanup old local photos (weekly)
    if datetime.now().weekday() == 0 and datetime.now().hour < 1:
        cleanup_old_local_photos()

    # 9. Report cycle time
    elapsed = time.time() - cycle_start
    log.info(f'Cycle complete in {elapsed:.1f}s')

    # 10. Set next alarm and shutdown
    set_next_alarm_and_shutdown()


if __name__ == '__main__':
    main()

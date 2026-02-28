const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const auth = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ============ DEVICE STATUS ============

// GET /api/v1/devices/:farmId/status — Full device status
router.get('/:farmId/status', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*,
        (SELECT COUNT(*) FROM captured_photos WHERE farm_id = $1
         AND captured_at > CURRENT_DATE) as photos_today,
        (SELECT COUNT(*) FROM captured_photos WHERE farm_id = $1) as total_photos,
        (SELECT MAX(captured_at) FROM captured_photos WHERE farm_id = $1) as last_capture
       FROM farm_devices d WHERE d.farm_id = $1`,
      [req.params.farmId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'Device not found' });
    }

    const d = result.rows[0];
    res.json({
      success: true,
      data: {
        firmware_version: d.firmware_version,
        uptime: d.uptime,
        last_boot: d.last_boot,
        last_capture: d.last_capture,
        photos_today: parseInt(d.photos_today),
        total_photos: parseInt(d.total_photos),
        // Power
        battery_percent: d.battery_percent,
        battery_voltage: d.battery_voltage,
        charging_source: d.charging_source,
        estimated_runtime: d.estimated_runtime,
        solar_connected: d.solar_connected,
        dc_adapter_connected: d.dc_adapter_connected,
        ext_battery_connected: d.ext_battery_connected,
        // Storage
        sd1_used_gb: d.sd1_used_gb,
        sd1_capacity_gb: d.sd1_capacity_gb,
        sd2_detected: d.sd2_detected,
        sd2_used_gb: d.sd2_used_gb,
        sd2_capacity_gb: d.sd2_capacity_gb,
        usb_drive_detected: d.cctv_external_drive_detected,
        usb_used_gb: d.cctv_drive_used_gb,
        usb_capacity_gb: d.cctv_drive_capacity_gb,
        // Connectivity
        wifi_connected: d.wifi_connected,
        wifi_ssid: d.wifi_ssid,
        lte_connected: d.lte_connected,
        lte_carrier: d.lte_carrier,
        lora_connected: d.lora_connected,
        signal_strength: d.signal_strength,
        // Sensors
        temperature: d.last_temperature,
        humidity: d.last_humidity,
        soil_moisture: d.last_soil_moisture,
        uv_index: d.last_uv_index,
        light_level: d.last_light_level,
        rain_gauge_active: d.rain_gauge_active,
      },
    });
  } catch (err) {
    console.error('Device status error:', err);
    res.status(500).json({ success: false, error: 'Failed to get device status' });
  }
});

// POST /api/v1/devices/:farmId/heartbeat — Device reports its status
router.post('/:farmId/heartbeat', auth, async (req, res) => {
  try {
    const {
      firmware_version, uptime, battery_percent, battery_voltage,
      charging_source, solar_connected, dc_adapter_connected, ext_battery_connected,
      sd1_used_gb, sd1_capacity_gb, sd2_detected, sd2_used_gb, sd2_capacity_gb,
      wifi_connected, wifi_ssid, lte_connected, lte_carrier, lora_connected, signal_strength,
      temperature, humidity, soil_moisture, uv_index, light_level, rain_gauge_active,
    } = req.body;

    // Calculate estimated runtime from battery
    const powerPerDay = 6.84; // Wh at 24MP mode
    const usableWh = (battery_percent / 100) * 57.6; // 6Ah * 12V * 0.8 DoD
    const daysLeft = Math.floor(usableWh / powerPerDay * 10) / 10;
    const estimated_runtime = daysLeft > 1 ? `${daysLeft} days` : `${Math.floor(daysLeft * 24)} hours`;

    await pool.query(
      `INSERT INTO farm_devices (farm_id, firmware_version, uptime, last_boot,
        battery_percent, battery_voltage, charging_source, estimated_runtime,
        solar_connected, dc_adapter_connected, ext_battery_connected,
        sd1_used_gb, sd1_capacity_gb, sd2_detected, sd2_used_gb, sd2_capacity_gb,
        wifi_connected, wifi_ssid, lte_connected, lte_carrier, lora_connected, signal_strength,
        last_temperature, last_humidity, last_soil_moisture, last_uv_index, last_light_level,
        rain_gauge_active, last_heartbeat)
       VALUES ($1,$2,$3,NOW(),$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,NOW())
       ON CONFLICT (farm_id) DO UPDATE SET
        firmware_version=EXCLUDED.firmware_version, uptime=EXCLUDED.uptime,
        battery_percent=EXCLUDED.battery_percent, battery_voltage=EXCLUDED.battery_voltage,
        charging_source=EXCLUDED.charging_source, estimated_runtime=EXCLUDED.estimated_runtime,
        solar_connected=EXCLUDED.solar_connected, dc_adapter_connected=EXCLUDED.dc_adapter_connected,
        ext_battery_connected=EXCLUDED.ext_battery_connected,
        sd1_used_gb=EXCLUDED.sd1_used_gb, sd1_capacity_gb=EXCLUDED.sd1_capacity_gb,
        sd2_detected=EXCLUDED.sd2_detected, sd2_used_gb=EXCLUDED.sd2_used_gb, sd2_capacity_gb=EXCLUDED.sd2_capacity_gb,
        wifi_connected=EXCLUDED.wifi_connected, wifi_ssid=EXCLUDED.wifi_ssid,
        lte_connected=EXCLUDED.lte_connected, lte_carrier=EXCLUDED.lte_carrier,
        lora_connected=EXCLUDED.lora_connected, signal_strength=EXCLUDED.signal_strength,
        last_temperature=EXCLUDED.last_temperature, last_humidity=EXCLUDED.last_humidity,
        last_soil_moisture=EXCLUDED.last_soil_moisture, last_uv_index=EXCLUDED.last_uv_index,
        last_light_level=EXCLUDED.last_light_level, rain_gauge_active=EXCLUDED.rain_gauge_active,
        last_heartbeat=NOW()`,
      [req.params.farmId, firmware_version, uptime, battery_percent, battery_voltage,
       charging_source, estimated_runtime, solar_connected, dc_adapter_connected, ext_battery_connected,
       sd1_used_gb, sd1_capacity_gb, sd2_detected, sd2_used_gb, sd2_capacity_gb,
       wifi_connected, wifi_ssid, lte_connected, lte_carrier, lora_connected, signal_strength,
       temperature, humidity, soil_moisture, uv_index, light_level, rain_gauge_active]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Heartbeat error:', err);
    res.status(500).json({ success: false, error: 'Failed to save heartbeat' });
  }
});

// ============ UPDATE MANAGEMENT ============

// GET /api/v1/devices/:farmId/update/status — Current update status
router.get('/:farmId/update/status', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT update_status, update_progress, update_message,
              update_version, firmware_version
       FROM farm_devices WHERE farm_id = $1`,
      [req.params.farmId]
    );

    if (!result.rows.length) {
      return res.json({ success: true, data: { status: 'idle', progress: 0, message: '', current_version: '0.0.0' } });
    }

    const d = result.rows[0];
    res.json({
      success: true,
      data: {
        status: d.update_status || 'idle',
        progress: parseFloat(d.update_progress || 0),
        message: d.update_message || '',
        version: d.update_version,
        current_version: d.firmware_version,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get update status' });
  }
});

// GET /api/v1/devices/:farmId/update/check — Check for available updates
router.get('/:farmId/update/check', auth, async (req, res) => {
  try {
    // Get current device version
    const device = await pool.query(
      'SELECT firmware_version FROM farm_devices WHERE farm_id = $1',
      [req.params.farmId]
    );
    const currentVersion = device.rows[0]?.firmware_version || '0.0.0';

    // Check for newer releases
    const updates = await pool.query(
      `SELECT * FROM firmware_releases
       WHERE version > $1 AND status = 'released'
       ORDER BY version DESC LIMIT 1`,
      [currentVersion]
    );

    if (!updates.rows.length) {
      return res.status(204).send(); // No update
    }

    const update = updates.rows[0];
    res.json({
      success: true,
      data: {
        version: update.version,
        release_date: update.release_date,
        changelog: update.changelog,
        size_mb: update.size_mb,
        min_version: update.min_version,
        checksum: update.checksum_sha256,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Check failed' });
  }
});

// GET /api/v1/devices/:farmId/update/history — Update history
router.get('/:farmId/update/history', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM update_history WHERE farm_id = $1 ORDER BY installed_at DESC LIMIT 20`,
      [req.params.farmId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

// POST /api/v1/devices/:farmId/update/ota — Trigger OTA update
router.post('/:farmId/update/ota', auth, async (req, res) => {
  try {
    const { version } = req.body;

    // Mark device for OTA update (device picks up on next heartbeat)
    await pool.query(
      `UPDATE farm_devices SET
        update_status = 'pending_ota',
        update_version = $1,
        update_message = 'OTA update queued'
       WHERE farm_id = $2`,
      [version, req.params.farmId]
    );

    res.json({ success: true, data: { status: 'pending_ota', version } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to trigger OTA' });
  }
});

// GET /api/v1/devices/:farmId/update/download — Download SD2 update package
router.get('/:farmId/update/download', auth, async (req, res) => {
  try {
    const { version } = req.query;
    const release = await pool.query(
      `SELECT * FROM firmware_releases WHERE version = $1 AND status = 'released'`,
      [version]
    );

    if (!release.rows.length) {
      return res.status(404).json({ success: false, error: 'Release not found' });
    }

    const filePath = release.rows[0].file_path;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Package file not found' });
    }

    res.download(filePath, `agrivision-update-v${version}.zip`);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Download failed' });
  }
});

// POST /api/v1/devices/:farmId/update/report — Device reports update result
router.post('/:farmId/update/report', auth, async (req, res) => {
  try {
    const { version, success, previous_version, error_message } = req.body;

    // Record in history
    await pool.query(
      `INSERT INTO update_history (farm_id, version, previous_version, installed_at, success, error_message)
       VALUES ($1, $2, $3, NOW(), $4, $5)`,
      [req.params.farmId, version, previous_version, success, error_message]
    );

    // Update device status
    await pool.query(
      `UPDATE farm_devices SET
        update_status = $1,
        update_message = $2,
        firmware_version = CASE WHEN $3 THEN $4 ELSE firmware_version END
       WHERE farm_id = $5`,
      [success ? 'completed' : 'failed', success ? 'Updated' : error_message, success, version, req.params.farmId]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

module.exports = router;

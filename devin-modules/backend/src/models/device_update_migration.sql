-- ============================================================
-- DEVICE & UPDATE MODULE — Database Migration
-- Agrivision v2.1 — Custom CM4 Board + Arducam 64MP
-- ============================================================

-- Farm devices — one per farm, stores real-time device state
CREATE TABLE IF NOT EXISTS farm_devices (
  farm_id UUID PRIMARY KEY REFERENCES farm_identities(id),
  device_id VARCHAR(100) UNIQUE,
  firmware_version VARCHAR(20) DEFAULT '1.0.0',
  uptime VARCHAR(50),
  last_boot TIMESTAMPTZ,
  last_heartbeat TIMESTAMPTZ,
  -- Power (LiFePO4 12V 6Ah hub model)
  battery_percent INTEGER DEFAULT 0,
  battery_voltage DECIMAL(4,2),
  charging_source VARCHAR(50), -- 'solar', 'dc_adapter', 'ext_battery', null
  estimated_runtime VARCHAR(50),
  solar_connected BOOLEAN DEFAULT FALSE,
  dc_adapter_connected BOOLEAN DEFAULT FALSE,
  ext_battery_connected BOOLEAN DEFAULT FALSE,
  -- Storage
  sd1_used_gb INTEGER DEFAULT 0,
  sd1_capacity_gb INTEGER DEFAULT 32,
  sd2_detected BOOLEAN DEFAULT FALSE,
  sd2_used_gb INTEGER DEFAULT 0,
  sd2_capacity_gb INTEGER DEFAULT 0,
  -- Connectivity
  wifi_connected BOOLEAN DEFAULT FALSE,
  wifi_ssid VARCHAR(100),
  lte_connected BOOLEAN DEFAULT FALSE,
  lte_carrier VARCHAR(50),
  lora_connected BOOLEAN DEFAULT FALSE,
  signal_strength INTEGER DEFAULT 0,
  -- Latest sensor readings
  last_temperature DECIMAL(5,2),
  last_humidity DECIMAL(5,2),
  last_soil_moisture DECIMAL(5,2),
  last_uv_index DECIMAL(4,2),
  last_light_level DECIMAL(8,2),
  rain_gauge_active BOOLEAN DEFAULT FALSE,
  -- CCTV (from timelapse module)
  cctv_enabled BOOLEAN DEFAULT FALSE,
  cctv_external_drive_detected BOOLEAN DEFAULT FALSE,
  cctv_drive_label VARCHAR(100),
  cctv_drive_capacity_gb INTEGER DEFAULT 0,
  cctv_drive_used_gb INTEGER DEFAULT 0,
  cctv_recording_count INTEGER DEFAULT 0,
  cctv_last_recording TIMESTAMPTZ,
  -- Update management
  update_status VARCHAR(30) DEFAULT 'idle',
  update_progress DECIMAL(3,2) DEFAULT 0,
  update_message TEXT,
  update_version VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Firmware releases — managed by admin
CREATE TABLE IF NOT EXISTS firmware_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(20) NOT NULL UNIQUE,
  release_date DATE NOT NULL,
  changelog TEXT,
  min_version VARCHAR(20) DEFAULT '0.0.0',
  size_mb INTEGER,
  checksum_sha256 VARCHAR(64) NOT NULL,
  file_path TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'released', -- draft, released, deprecated
  hardware_target VARCHAR(50) DEFAULT 'cm4-v2.1',
  camera_target VARCHAR(50) DEFAULT 'arducam-64mp',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_releases_version ON firmware_releases(version DESC);

-- Update history — log of all attempted updates per device
CREATE TABLE IF NOT EXISTS update_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farm_identities(id),
  version VARCHAR(20) NOT NULL,
  previous_version VARCHAR(20),
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  method VARCHAR(20) DEFAULT 'sd2', -- sd2, ota
  error_message TEXT,
  changelog TEXT
);

CREATE INDEX idx_update_history_farm ON update_history(farm_id, installed_at DESC);

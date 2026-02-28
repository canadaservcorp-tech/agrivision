-- ============================================================
-- TIMELAPSE & CCTV MODULE — Database Migration
-- Agrivision v2.1 — Performance Cristal Technologies Avancées S.A.
-- ============================================================

-- Captured photos (every 20 min from hardware module)
CREATE TABLE IF NOT EXISTS captured_photos (
  id UUID PRIMARY KEY,
  farm_id UUID NOT NULL REFERENCES farm_identities(id),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  -- Sensor data snapshot at capture time
  temperature DECIMAL(5,2),
  humidity DECIMAL(5,2),
  soil_moisture DECIMAL(5,2),
  uv_index DECIMAL(4,2),
  light_level DECIMAL(8,2),
  -- AI analysis
  has_disease_alert BOOLEAN DEFAULT FALSE,
  disease_type VARCHAR(100),
  disease_confidence DECIMAL(5,4),
  ai_inference_ms INTEGER,
  -- Storage info
  file_size_kb INTEGER DEFAULT 0,
  resolution VARCHAR(20) DEFAULT '6000x4000',
  source VARCHAR(20) DEFAULT 'scheduled', -- scheduled, manual, cctv
  -- CCTV mode: also saved to external drive?
  saved_to_external BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photos_farm_date ON captured_photos(farm_id, captured_at DESC);
CREATE INDEX idx_photos_disease ON captured_photos(farm_id, has_disease_alert) WHERE has_disease_alert = TRUE;

-- Time-lapse generation jobs
CREATE TABLE IF NOT EXISTS timelapse_jobs (
  id UUID PRIMARY KEY,
  farm_id UUID NOT NULL REFERENCES farm_identities(id),
  user_id UUID NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  fps INTEGER DEFAULT 10,
  resolution VARCHAR(10) DEFAULT '1080p',
  show_logo BOOLEAN DEFAULT TRUE,
  show_timestamp BOOLEAN DEFAULT TRUE,
  show_weather BOOLEAN DEFAULT FALSE,
  farm_name VARCHAR(200),
  farm_logo_url TEXT,
  photo_count INTEGER DEFAULT 0,
  -- Progress tracking
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  progress DECIMAL(3,2) DEFAULT 0,
  status_text VARCHAR(200) DEFAULT 'Queued',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Generated time-lapse videos
CREATE TABLE IF NOT EXISTS timelapse_videos (
  id UUID PRIMARY KEY,
  farm_id UUID NOT NULL REFERENCES farm_identities(id),
  job_id UUID REFERENCES timelapse_jobs(id),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  photo_count INTEGER NOT NULL,
  fps INTEGER DEFAULT 10,
  resolution VARCHAR(10) DEFAULT '1080p',
  duration_seconds INTEGER NOT NULL,
  video_url TEXT NOT NULL,
  video_path TEXT, -- local filesystem path
  thumbnail_url TEXT,
  has_logo BOOLEAN DEFAULT TRUE,
  has_timestamp BOOLEAN DEFAULT TRUE,
  has_weather BOOLEAN DEFAULT FALSE,
  file_size_mb VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_videos_farm ON timelapse_videos(farm_id, created_at DESC);

-- CCTV mode fields on farm_devices table
ALTER TABLE farm_devices ADD COLUMN IF NOT EXISTS cctv_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE farm_devices ADD COLUMN IF NOT EXISTS cctv_external_drive_detected BOOLEAN DEFAULT FALSE;
ALTER TABLE farm_devices ADD COLUMN IF NOT EXISTS cctv_drive_label VARCHAR(100);
ALTER TABLE farm_devices ADD COLUMN IF NOT EXISTS cctv_drive_capacity_gb INTEGER DEFAULT 0;
ALTER TABLE farm_devices ADD COLUMN IF NOT EXISTS cctv_drive_used_gb INTEGER DEFAULT 0;
ALTER TABLE farm_devices ADD COLUMN IF NOT EXISTS cctv_recording_count INTEGER DEFAULT 0;
ALTER TABLE farm_devices ADD COLUMN IF NOT EXISTS cctv_last_recording TIMESTAMPTZ;

-- ============================================================
-- STORAGE CLEANUP — auto-delete photos older than 90 days
-- (keeps videos, deletes source photos to save SD card space)
-- Run via cron: SELECT cleanup_old_photos();
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_old_photos()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM captured_photos
  WHERE captured_at < NOW() - INTERVAL '90 days'
  AND saved_to_external = TRUE;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

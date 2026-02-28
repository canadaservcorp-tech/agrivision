-- ============================================
-- AGRIVISION ENHANCEMENT MIGRATIONS
-- EU Workshop Features - February 2026
-- Run: psql $DATABASE_URL < enhancement_migrations.sql
-- ============================================

-- 1. Digital Farm ID Registry
CREATE TABLE IF NOT EXISTS farm_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  farm_code VARCHAR(50) UNIQUE NOT NULL,  -- Standardized ID: COUNTRY-REGION-NNNN
  farm_name VARCHAR(255) NOT NULL,
  country_code CHAR(2) NOT NULL,
  region VARCHAR(100),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  total_area_ha DECIMAL(10, 2),
  primary_crops TEXT[],
  soil_type VARCHAR(50),
  climate_zone VARCHAR(50),
  ceads_compatible BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_farm_identities_user ON farm_identities(user_id);
CREATE INDEX idx_farm_identities_country ON farm_identities(country_code);
CREATE INDEX idx_farm_identities_location ON farm_identities USING gist (
  point(longitude, latitude)
);

-- 2. Data Consent & Sovereignty
CREATE TABLE IF NOT EXISTS data_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farm_identities(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL,  -- 'research', 'benchmarking', 'commercial', 'government'
  granted BOOLEAN DEFAULT false,
  granted_to VARCHAR(255),  -- Organization name or 'public'
  data_categories TEXT[],   -- ['sensor', 'yield', 'images', 'financial']
  remuneration_type VARCHAR(50),  -- 'free', 'credit', 'monetary'
  remuneration_amount DECIMAL(10, 2) DEFAULT 0,
  valid_from TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_data_consents_farm ON data_consents(farm_id);

-- 3. Climate Forecasts
CREATE TABLE IF NOT EXISTS climate_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID REFERENCES farm_identities(id) ON DELETE SET NULL,
  region VARCHAR(100),
  forecast_date DATE NOT NULL,
  forecast_horizon_days INTEGER NOT NULL,  -- 7, 14, 30, 90
  model_type VARCHAR(50) NOT NULL,  -- 'lstm', 'ensemble', 'statistical'
  predictions JSONB NOT NULL,
  -- predictions: { temp_min, temp_max, precipitation_mm, humidity_pct,
  --                frost_risk, drought_risk, flood_risk, heat_stress_risk }
  confidence_score DECIMAL(5, 4),  -- 0.0000 to 1.0000
  actual_values JSONB,  -- Filled after observation for model evaluation
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_climate_forecasts_farm ON climate_forecasts(farm_id);
CREATE INDEX idx_climate_forecasts_date ON climate_forecasts(forecast_date);
CREATE INDEX idx_climate_forecasts_region ON climate_forecasts(region);

-- 4. Anomaly Detection Logs
CREATE TABLE IF NOT EXISTS anomaly_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID REFERENCES farm_identities(id) ON DELETE SET NULL,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  anomaly_type VARCHAR(50) NOT NULL,  -- 'environmental', 'food_safety', 'equipment', 'disease'
  severity VARCHAR(20) NOT NULL,  -- 'low', 'medium', 'high', 'critical'
  sensor_data JSONB NOT NULL,
  detection_model VARCHAR(50) NOT NULL,  -- 'isolation_forest', 'autoencoder', 'threshold'
  anomaly_score DECIMAL(8, 6),
  description TEXT,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_anomaly_logs_farm ON anomaly_logs(farm_id);
CREATE INDEX idx_anomaly_logs_severity ON anomaly_logs(severity);
CREATE INDEX idx_anomaly_logs_type ON anomaly_logs(anomaly_type);
CREATE INDEX idx_anomaly_logs_unresolved ON anomaly_logs(resolved) WHERE resolved = false;

-- 5. Farm Benchmarks (anonymized)
CREATE TABLE IF NOT EXISTS benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID REFERENCES farm_identities(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  crop_type VARCHAR(100) NOT NULL,
  metrics JSONB NOT NULL,
  -- metrics: { yield_per_ha, water_usage_m3_per_ha, fertilizer_kg_per_ha,
  --            pesticide_applications, disease_incidents, revenue_per_ha,
  --            carbon_footprint_kg_co2_per_ha, energy_kwh_per_ha }
  region VARCHAR(100),
  climate_zone VARCHAR(50),
  farm_size_category VARCHAR(20),  -- 'small', 'medium', 'large'
  anonymized BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_benchmarks_crop ON benchmarks(crop_type);
CREATE INDEX idx_benchmarks_period ON benchmarks(period_start, period_end);
CREATE INDEX idx_benchmarks_region ON benchmarks(region);

-- 6. Compliance Reports
CREATE TABLE IF NOT EXISTS compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farm_identities(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL,  -- 'carbon_footprint', 'sustainability', 'pesticide_usage', 'water_usage'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',  -- 'draft', 'generated', 'submitted', 'approved'
  report_data JSONB NOT NULL,
  -- carbon: { scope1_kg, scope2_kg, scope3_kg, total_kg, offset_kg, net_kg,
  --           breakdown: { machinery, livestock, fertilizer, energy, transport } }
  generated_by VARCHAR(50) DEFAULT 'ai',  -- 'ai', 'manual', 'hybrid'
  pdf_url VARCHAR(500),
  submitted_to VARCHAR(255),
  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_compliance_reports_farm ON compliance_reports(farm_id);
CREATE INDEX idx_compliance_reports_type ON compliance_reports(report_type);

-- 7. Advisory Chat History
CREATE TABLE IF NOT EXISTS advisory_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farm_identities(id) ON DELETE SET NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  -- messages: [{ role: 'user'|'assistant', content: '...', timestamp: '...' }]
  topic VARCHAR(100),
  language VARCHAR(10) DEFAULT 'en',
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_advisory_chats_user ON advisory_chats(user_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_farm_identities_modtime
  BEFORE UPDATE ON farm_identities
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_compliance_reports_modtime
  BEFORE UPDATE ON compliance_reports
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_advisory_chats_modtime
  BEFORE UPDATE ON advisory_chats
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

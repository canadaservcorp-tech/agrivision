-- ============================================
-- AGRIVISION FRANCHISE & CERTIFICATION TABLES
-- Run: psql $DATABASE_URL < franchise_cert_migrations.sql
-- ============================================

-- 1. Franchise Partner Applications
CREATE TABLE IF NOT EXISTS franchise_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Personal / Contact
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  preferred_language VARCHAR(10) DEFAULT 'en', -- en, fr, ar, tr
  
  -- Business Info
  company_name VARCHAR(255),
  business_type VARCHAR(50) NOT NULL,  -- 'farm', 'cooperative', 'distributor', 'agtech_company', 'investor', 'government', 'ngo', 'research', 'other'
  business_description TEXT NOT NULL,
  years_in_business INTEGER,
  number_of_employees INTEGER,
  annual_revenue_range VARCHAR(50),  -- 'under_50k', '50k_250k', '250k_1m', '1m_5m', 'over_5m'
  
  -- Location
  country VARCHAR(100) NOT NULL,
  region VARCHAR(100),
  city VARCHAR(100),
  address TEXT,
  
  -- Farm-specific (if applicable)
  farm_size_ha DECIMAL(10, 2),
  primary_crops TEXT[],
  current_technology TEXT,  -- what tech they currently use
  
  -- Interest / Goals
  interest_type VARCHAR(50) NOT NULL,  -- 'regional_partner', 'reseller', 'white_label', 'pilot_farm', 'investor', 'research_partner'
  target_market TEXT,
  expected_coverage_area TEXT,
  why_interested TEXT,
  how_heard_about_us VARCHAR(100),  -- 'social_media', 'website', 'referral', 'event', 'search', 'other'
  
  -- Documents
  business_license_url VARCHAR(500),
  additional_docs_url VARCHAR(500),
  website_url VARCHAR(500),
  linkedin_url VARCHAR(500),
  
  -- Internal
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'reviewing', 'approved', 'rejected', 'active', 'suspended'
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  partner_code VARCHAR(20) UNIQUE,  -- Generated on approval: AGV-PARTNER-XXXX
  agreement_signed BOOLEAN DEFAULT false,
  agreement_date TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_franchise_status ON franchise_partners(status);
CREATE INDEX idx_franchise_email ON franchise_partners(email);
CREATE INDEX idx_franchise_country ON franchise_partners(country);

-- 2. Green Farmer Certificates
CREATE TABLE IF NOT EXISTS green_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Farm reference
  farm_id UUID NOT NULL REFERENCES farm_identities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Certificate identity
  certificate_number VARCHAR(30) UNIQUE NOT NULL,  -- AGV-GC-2026-XXXX
  certificate_type VARCHAR(30) NOT NULL,  -- 'disease_free', 'organic_compliant', 'sustainable', 'premium'
  
  -- Farm details on certificate
  farm_name VARCHAR(255) NOT NULL,
  farmer_name VARCHAR(255) NOT NULL,
  farm_location VARCHAR(255),
  farm_area_ha DECIMAL(10, 2),
  
  -- Products & Season
  certified_products TEXT[] NOT NULL,  -- ['tomatoes', 'wheat', 'olives']
  season VARCHAR(50) NOT NULL,  -- 'spring_2026', 'summer_2026', 'fall_2026', 'winter_2026', 'full_year_2026'
  harvest_period_start DATE,
  harvest_period_end DATE,
  
  -- Certification criteria scores
  criteria_scores JSONB NOT NULL,
  -- {
  --   disease_detection_score: 95,        -- % scans disease-free
  --   inspection_count: 24,               -- number of AI scans completed
  --   consecutive_clean_days: 60,         -- days without disease detection
  --   soil_health_score: 88,              -- from sensor data
  --   water_management_score: 92,         -- irrigation efficiency
  --   pesticide_compliance: true,         -- within allowed limits
  --   environmental_score: 85,            -- overall environmental practices
  --   overall_score: 91                   -- weighted average
  -- }
  overall_score DECIMAL(5, 2) NOT NULL,  -- 0-100
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'issued', 'active', 'expired', 'revoked'
  issued_at TIMESTAMP,
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,  -- typically 1 season or 1 year
  revoked_at TIMESTAMP,
  revocation_reason TEXT,
  
  -- Verification
  qr_code_data VARCHAR(500),  -- URL for QR verification
  verification_hash VARCHAR(64),  -- SHA-256 for tamper-proof verification
  pdf_url VARCHAR(500),
  
  -- Metadata
  issued_by VARCHAR(100) DEFAULT 'Agrivision AI',
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cert_farm ON green_certificates(farm_id);
CREATE INDEX idx_cert_user ON green_certificates(user_id);
CREATE INDEX idx_cert_status ON green_certificates(status);
CREATE INDEX idx_cert_number ON green_certificates(certificate_number);
CREATE INDEX idx_cert_valid ON green_certificates(valid_until) WHERE status = 'active';

-- 3. Certification Criteria Configuration
CREATE TABLE IF NOT EXISTS certification_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  certificate_type VARCHAR(30) NOT NULL,  -- matches green_certificates.certificate_type
  criteria_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Thresholds
  minimum_score DECIMAL(5, 2) NOT NULL,  -- minimum to pass
  weight DECIMAL(3, 2) NOT NULL DEFAULT 1.0,  -- weight in overall score (0.0-1.0)
  data_source VARCHAR(50) NOT NULL,  -- 'disease_scans', 'sensor_data', 'manual_input', 'compliance_reports'
  evaluation_method VARCHAR(50),  -- 'percentage', 'count', 'boolean', 'threshold'
  
  -- Active period
  active BOOLEAN DEFAULT true,
  region VARCHAR(100),  -- NULL = global
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default criteria for 'disease_free' certificate
INSERT INTO certification_criteria (certificate_type, criteria_name, description, minimum_score, weight, data_source, evaluation_method) VALUES
  ('disease_free', 'Disease Detection Score', 'Percentage of AI scans returning disease-free result', 90.00, 0.30, 'disease_scans', 'percentage'),
  ('disease_free', 'Inspection Frequency', 'Minimum number of AI scans completed in certification period', 12.00, 0.10, 'disease_scans', 'count'),
  ('disease_free', 'Consecutive Clean Days', 'Minimum consecutive days without disease detection', 30.00, 0.20, 'disease_scans', 'count'),
  ('disease_free', 'Soil Health Score', 'Soil moisture and nutrient levels within optimal range', 70.00, 0.15, 'sensor_data', 'percentage'),
  ('disease_free', 'Water Management', 'Irrigation efficiency based on soil moisture sensor data', 65.00, 0.10, 'sensor_data', 'percentage'),
  ('disease_free', 'Pesticide Compliance', 'Usage within Agrivision recommended limits (1=compliant)', 1.00, 0.10, 'manual_input', 'boolean'),
  ('disease_free', 'Environmental Score', 'Overall environmental practices assessment', 60.00, 0.05, 'compliance_reports', 'percentage');

-- Triggers
CREATE TRIGGER update_franchise_modtime
  BEFORE UPDATE ON franchise_partners
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_cert_modtime
  BEFORE UPDATE ON green_certificates
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

// ═══ Agrivision Database — PostgreSQL with 11 Tables ═══
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      -- 1. Users
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL, role VARCHAR(50) DEFAULT 'farmer', plan VARCHAR(50) DEFAULT 'free',
        subscription_id VARCHAR(255), language VARCHAR(10) DEFAULT 'en',
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      );
      -- 2. Devices
      CREATE TABLE IF NOT EXISTS devices (
        id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), device_uuid VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255), location_lat DECIMAL(10,7), location_lng DECIMAL(10,7),
        crop_type VARCHAR(100), firmware_version VARCHAR(50), status VARCHAR(20) DEFAULT 'offline',
        last_seen TIMESTAMP, created_at TIMESTAMP DEFAULT NOW()
      );
      -- 3. Sensor Readings
      CREATE TABLE IF NOT EXISTS readings (
        id SERIAL PRIMARY KEY, device_id INTEGER REFERENCES devices(id),
        temperature DECIMAL(5,2), humidity DECIMAL(5,2), soil_moisture DECIMAL(5,2),
        battery_voltage DECIMAL(4,2), signal_strength INTEGER,
        recorded_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_readings_device ON readings(device_id, recorded_at DESC);
      -- 4. Disease Detections
      CREATE TABLE IF NOT EXISTS detections (
        id SERIAL PRIMARY KEY, device_id INTEGER REFERENCES devices(id),
        image_url TEXT, disease_name VARCHAR(255), confidence DECIMAL(5,4),
        top_predictions JSONB, severity VARCHAR(20),
        detected_at TIMESTAMP DEFAULT NOW()
      );
      -- 5. Alerts
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), device_id INTEGER REFERENCES devices(id),
        type VARCHAR(50) NOT NULL, severity VARCHAR(20) DEFAULT 'info',
        title VARCHAR(255), message TEXT, read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id, created_at DESC);
      -- 6. Companies
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id),
        company_name VARCHAR(255) NOT NULL, industry VARCHAR(100),
        plan VARCHAR(50) DEFAULT 'basic', contact_email VARCHAR(255),
        website VARCHAR(255), created_at TIMESTAMP DEFAULT NOW()
      );
      -- 7. Company Subscriptions
      CREATE TABLE IF NOT EXISTS company_subscriptions (
        id SERIAL PRIMARY KEY, company_id INTEGER REFERENCES companies(id),
        plan VARCHAR(50) NOT NULL, price_monthly DECIMAL(10,2),
        max_farmer_contacts INTEGER, max_ad_slots INTEGER,
        status VARCHAR(20) DEFAULT 'active', starts_at TIMESTAMP, expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      -- 8. Chat Messages
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY, sender_id INTEGER REFERENCES users(id),
        receiver_id INTEGER REFERENCES users(id), message TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(sender_id, receiver_id, created_at DESC);
      -- 9. News/Blog
      CREATE TABLE IF NOT EXISTS news (
        id SERIAL PRIMARY KEY, author_id INTEGER REFERENCES users(id),
        title VARCHAR(500) NOT NULL, slug VARCHAR(500) UNIQUE,
        content TEXT, category VARCHAR(100), image_url TEXT,
        published BOOLEAN DEFAULT FALSE, published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      -- 10. Advertisements
      CREATE TABLE IF NOT EXISTS ads (
        id SERIAL PRIMARY KEY, company_id INTEGER REFERENCES companies(id),
        slot VARCHAR(50) NOT NULL, html TEXT, image_url TEXT,
        link_url TEXT, impressions INTEGER DEFAULT 0, clicks INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT TRUE, starts_at TIMESTAMP, expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      -- 11. Payments
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id),
        company_id INTEGER REFERENCES companies(id),
        type VARCHAR(50), amount DECIMAL(10,2), currency VARCHAR(10) DEFAULT 'USD',
        provider VARCHAR(50), provider_id VARCHAR(255), status VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Database tables initialized');
  } finally { client.release(); }
}

module.exports = { pool, initDB };

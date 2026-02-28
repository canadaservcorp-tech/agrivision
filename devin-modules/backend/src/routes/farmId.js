const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Generate standardized farm code: CA-QC-0001
const generateFarmCode = async (countryCode, region) => {
  const prefix = `${countryCode}-${region.substring(0, 2).toUpperCase()}`;
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM farm_identities WHERE farm_code LIKE $1`,
    [`${prefix}-%`]
  );
  const num = parseInt(result.rows[0].count) + 1;
  return `${prefix}-${String(num).padStart(4, '0')}`;
};

// POST /api/v1/farm-id — Register new farm identity
router.post('/', auth, async (req, res) => {
  try {
    const { farm_name, country_code, region, latitude, longitude,
            total_area_ha, primary_crops, soil_type, climate_zone } = req.body;

    if (!farm_name || !country_code || !region) {
      return res.status(400).json({ success: false, error: 'farm_name, country_code, region required' });
    }

    const farmCode = await generateFarmCode(country_code, region);

    const result = await pool.query(
      `INSERT INTO farm_identities 
       (user_id, farm_code, farm_name, country_code, region, latitude, longitude,
        total_area_ha, primary_crops, soil_type, climate_zone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [req.user.id, farmCode, farm_name, country_code, region, latitude, longitude,
       total_area_ha, primary_crops || [], soil_type, climate_zone]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Farm ID creation error:', err);
    res.status(500).json({ success: false, error: 'Failed to create farm identity' });
  }
});

// GET /api/v1/farm-id — Get user's farms
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM farm_identities WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch farms' });
  }
});

// GET /api/v1/farm-id/:farmCode — Get farm by code (public lookup)
router.get('/:farmCode', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT farm_code, farm_name, country_code, region, primary_crops, 
              climate_zone, ceads_compatible, created_at
       FROM farm_identities WHERE farm_code = $1`,
      [req.params.farmCode]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Farm not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Lookup failed' });
  }
});

// PUT /api/v1/farm-id/:id — Update farm
router.put('/:id', auth, async (req, res) => {
  try {
    const { farm_name, latitude, longitude, total_area_ha, primary_crops,
            soil_type, climate_zone, metadata } = req.body;

    const result = await pool.query(
      `UPDATE farm_identities SET
        farm_name = COALESCE($1, farm_name),
        latitude = COALESCE($2, latitude),
        longitude = COALESCE($3, longitude),
        total_area_ha = COALESCE($4, total_area_ha),
        primary_crops = COALESCE($5, primary_crops),
        soil_type = COALESCE($6, soil_type),
        climate_zone = COALESCE($7, climate_zone),
        metadata = COALESCE($8, metadata)
       WHERE id = $9 AND user_id = $10 RETURNING *`,
      [farm_name, latitude, longitude, total_area_ha, primary_crops,
       soil_type, climate_zone, metadata, req.params.id, req.user.id]
    );

    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Farm not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Update failed' });
  }
});

// POST /api/v1/farm-id/:id/consent — Manage data sharing consent
router.post('/:id/consent', auth, async (req, res) => {
  try {
    const { consent_type, granted, granted_to, data_categories,
            remuneration_type, valid_until } = req.body;

    const result = await pool.query(
      `INSERT INTO data_consents 
       (farm_id, consent_type, granted, granted_to, data_categories,
        remuneration_type, valid_until)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.params.id, consent_type, granted, granted_to,
       data_categories || [], remuneration_type || 'free', valid_until]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Consent creation failed' });
  }
});

module.exports = router;

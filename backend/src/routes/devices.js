const router = require('express').Router();
const { pool } = require('../models/database');
const { authenticate } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

// POST /api/v1/devices/register
router.post('/register', authenticate, async (req, res) => {
  try {
    const { name, location_lat, location_lng, crop_type } = req.body;
    const device_uuid = uuid();
    const result = await pool.query(
      'INSERT INTO devices (user_id, device_uuid, name, location_lat, location_lng, crop_type) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [req.user.id, device_uuid, name, location_lat, location_lng, crop_type]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/v1/devices
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM devices WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/v1/devices/:id/heartbeat
router.post('/:id/heartbeat', async (req, res) => {
  try {
    const { firmware_version, status } = req.body;
    await pool.query('UPDATE devices SET last_seen=NOW(), status=$1, firmware_version=$2 WHERE device_uuid=$3',
      [status || 'online', firmware_version, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

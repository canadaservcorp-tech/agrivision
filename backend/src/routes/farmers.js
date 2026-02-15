const router = require('express').Router();
const { pool } = require('../models/database');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const { crop, region, limit = 50, offset = 0 } = req.query;
    let q = 'SELECT u.id, u.name, u.email, d.crop_type, d.location_lat, d.location_lng FROM users u LEFT JOIN devices d ON u.id=d.user_id WHERE u.role=$1';
    const params = ['farmer'];
    if (crop) { q += ` AND d.crop_type ILIKE $${params.length+1}`; params.push(`%${crop}%`); }
    q += ` LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(parseInt(limit), parseInt(offset));
    const result = await pool.query(q, params);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;

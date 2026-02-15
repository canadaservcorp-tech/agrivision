const router = require('express').Router();
const { pool } = require('../models/database');
const { authenticate } = require('../middleware/auth');

router.get('/serve/:slot', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM ads WHERE slot=$1 AND active=true AND (starts_at IS NULL OR starts_at <= NOW()) AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY RANDOM() LIMIT 1', [req.params.slot]);
    if (!r.rows[0]) return res.status(204).end();
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({error:e.message}); }
});
router.post('/:id/impression', async (req, res) => {
  try { await pool.query('UPDATE ads SET impressions=impressions+1 WHERE id=$1', [req.params.id]); res.json({ok:true}); } catch(e) { res.status(500).json({error:e.message}); }
});
router.post('/:id/click', async (req, res) => {
  try { await pool.query('UPDATE ads SET clicks=clicks+1 WHERE id=$1', [req.params.id]); res.json({ok:true}); } catch(e) { res.status(500).json({error:e.message}); }
});
router.post('/', authenticate, async (req, res) => {
  try {
    const { company_id, slot, html, image_url, link_url, starts_at, expires_at } = req.body;
    const r = await pool.query('INSERT INTO ads (company_id,slot,html,image_url,link_url,starts_at,expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [company_id,slot,html,image_url,link_url,starts_at,expires_at]);
    res.status(201).json(r.rows[0]);
  } catch(e) { res.status(500).json({error:e.message}); }
});
module.exports = router;

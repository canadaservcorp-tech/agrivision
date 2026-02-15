const router = require('express').Router();
const { pool } = require('../models/database');
const { authenticate, requireRole } = require('../middleware/auth');

router.post('/', authenticate, async (req, res) => {
  try {
    const { company_name, industry, contact_email, website } = req.body;
    const result = await pool.query('INSERT INTO companies (user_id, company_name, industry, contact_email, website) VALUES ($1,$2,$3,$4,$5) RETURNING *', [req.user.id, company_name, industry, contact_email, website]);
    await pool.query('UPDATE users SET role=$1 WHERE id=$2', ['company', req.user.id]);
    res.status(201).json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/my', authenticate, async (req, res) => {
  try { const r = await pool.query('SELECT * FROM companies WHERE user_id=$1', [req.user.id]); res.json(r.rows[0] || null); } catch(e) { res.status(500).json({error:e.message}); }
});
router.post('/:id/subscribe', authenticate, async (req, res) => {
  try {
    const { plan, price_monthly, max_farmer_contacts, max_ad_slots } = req.body;
    const result = await pool.query('INSERT INTO company_subscriptions (company_id, plan, price_monthly, max_farmer_contacts, max_ad_slots, starts_at, expires_at) VALUES ($1,$2,$3,$4,$5, NOW(), NOW() + INTERVAL \'30 days\') RETURNING *', [req.params.id, plan, price_monthly, max_farmer_contacts, max_ad_slots]);
    res.status(201).json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;

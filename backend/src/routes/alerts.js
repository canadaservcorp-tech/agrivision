const router = require('express').Router();
const { pool } = require('../models/database');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT a.*, d.name as device_name FROM alerts a LEFT JOIN devices d ON a.device_id=d.id WHERE a.user_id=$1 ORDER BY a.created_at DESC LIMIT 50', [req.user.id]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.patch('/:id/read', authenticate, async (req, res) => {
  try { await pool.query('UPDATE alerts SET read=true WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]); res.json({ok:true}); } catch(e) { res.status(500).json({error:e.message}); }
});
module.exports = router;

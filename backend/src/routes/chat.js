const router = require('express').Router();
const { pool } = require('../models/database');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, async (req, res) => {
  try {
    const { receiver_id, message } = req.body;
    const result = await pool.query('INSERT INTO messages (sender_id, receiver_id, message) VALUES ($1,$2,$3) RETURNING *', [req.user.id, receiver_id, message]);
    const io = req.app.get('io');
    if (io) io.to(`user-${receiver_id}`).emit('message', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/with/:userId', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM messages WHERE (sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1) ORDER BY created_at ASC LIMIT 100', [req.user.id, req.params.userId]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;

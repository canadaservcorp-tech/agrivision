const router = require('express').Router();
const { pool } = require('../models/database');
const { authenticate } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try { const r = await pool.query('SELECT * FROM news WHERE published=true ORDER BY published_at DESC LIMIT 20'); res.json(r.rows); } catch(e) { res.status(500).json({error:e.message}); }
});
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, content, category, image_url, published } = req.body;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const r = await pool.query('INSERT INTO news (author_id,title,slug,content,category,image_url,published,published_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *', [req.user.id,title,slug,content,category,image_url,published||false]);
    res.status(201).json(r.rows[0]);
  } catch(e) { res.status(500).json({error:e.message}); }
});
module.exports = router;

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const auth = require('../middleware/auth');
const advisoryService = require('../services/advisoryService');

// POST /api/v1/advisory/chat — Send message to advisory chatbot
router.post('/chat', auth, async (req, res) => {
  try {
    const { message, farm_id, chat_id, language = 'en' } = req.body;

    if (!message) return res.status(400).json({ success: false, error: 'Message required' });

    // Load or create chat session
    let chat;
    if (chat_id) {
      const existing = await pool.query(
        'SELECT * FROM advisory_chats WHERE id = $1 AND user_id = $2', [chat_id, req.user.id]
      );
      chat = existing.rows[0];
    }

    if (!chat) {
      const created = await pool.query(
        `INSERT INTO advisory_chats (user_id, farm_id, language, messages) 
         VALUES ($1,$2,$3,'[]') RETURNING *`,
        [req.user.id, farm_id, language]
      );
      chat = created.rows[0];
    }

    // Build context from farm data
    let farmContext = null;
    if (farm_id) {
      const farmData = await pool.query(
        `SELECT fi.*, 
          (SELECT json_agg(row_to_json(al)) FROM anomaly_logs al 
           WHERE al.farm_id = fi.id AND al.resolved = false LIMIT 5) as active_anomalies,
          (SELECT predictions FROM climate_forecasts cf 
           WHERE cf.farm_id = fi.id ORDER BY created_at DESC LIMIT 1) as latest_forecast
         FROM farm_identities fi WHERE fi.id = $1`, [farm_id]
      );
      farmContext = farmData.rows[0];
    }

    // Get response from AI
    const messages = chat.messages || [];
    messages.push({ role: 'user', content: message, timestamp: new Date().toISOString() });

    const aiResponse = await advisoryService.getResponse(messages, farmContext, language);

    messages.push({ role: 'assistant', content: aiResponse.text, timestamp: new Date().toISOString() });

    // Save chat
    await pool.query(
      `UPDATE advisory_chats SET messages = $1, tokens_used = tokens_used + $2,
       topic = COALESCE(topic, $3) WHERE id = $4`,
      [JSON.stringify(messages), aiResponse.tokens, aiResponse.topic, chat.id]
    );

    res.json({
      success: true,
      data: {
        chat_id: chat.id,
        response: aiResponse.text,
        sources: aiResponse.sources || [],
        suggested_actions: aiResponse.actions || []
      }
    });
  } catch (err) {
    console.error('Advisory chat error:', err);
    res.status(500).json({ success: false, error: 'Chat failed' });
  }
});

// GET /api/v1/advisory/history — Get chat history
router.get('/history', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, farm_id, topic, language, 
              messages->-1 as last_message, created_at, updated_at
       FROM advisory_chats WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

// GET /api/v1/advisory/chat/:chatId — Get full chat
router.get('/chat/:chatId', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM advisory_chats WHERE id = $1 AND user_id = $2',
      [req.params.chatId, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Chat not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch chat' });
  }
});

// DELETE /api/v1/advisory/chat/:chatId
router.delete('/chat/:chatId', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM advisory_chats WHERE id = $1 AND user_id = $2',
      [req.params.chatId, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Delete failed' });
  }
});

module.exports = router;

// ═══ readings.js ═══
const readingsRouter = require('express').Router();
const { pool } = require('../models/database');

readingsRouter.post('/', async (req, res) => {
  try {
    const { device_uuid, temperature, humidity, soil_moisture, battery_voltage, signal_strength } = req.body;
    const dev = await pool.query('SELECT id, user_id FROM devices WHERE device_uuid=$1', [device_uuid]);
    if (!dev.rows[0]) return res.status(404).json({ error: 'Device not found' });
    const result = await pool.query(
      'INSERT INTO readings (device_id, temperature, humidity, soil_moisture, battery_voltage, signal_strength) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [dev.rows[0].id, temperature, humidity, soil_moisture, battery_voltage, signal_strength]
    );
    // Emit via WebSocket
    const io = req.app.get('io');
    if (io) io.to(`device-${dev.rows[0].id}`).emit('reading', result.rows[0]);
    // Check thresholds for alerts
    if (temperature > 40) {
      await pool.query('INSERT INTO alerts (user_id,device_id,type,severity,title,message) VALUES ($1,$2,$3,$4,$5,$6)',
        [dev.rows[0].user_id, dev.rows[0].id, 'temperature', 'warning', 'High Temperature', `Temperature reached ${temperature}°C`]);
    }
    if (soil_moisture < 20) {
      await pool.query('INSERT INTO alerts (user_id,device_id,type,severity,title,message) VALUES ($1,$2,$3,$4,$5,$6)',
        [dev.rows[0].user_id, dev.rows[0].id, 'soil_moisture', 'warning', 'Low Soil Moisture', `Soil moisture at ${soil_moisture}%`]);
    }
    res.status(201).json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

readingsRouter.get('/device/:deviceId', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const result = await pool.query('SELECT * FROM readings WHERE device_id=$1 ORDER BY recorded_at DESC LIMIT $2', [req.params.deviceId, limit]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = readingsRouter;

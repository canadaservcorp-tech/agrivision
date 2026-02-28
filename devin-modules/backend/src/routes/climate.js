const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const auth = require('../middleware/auth');
const climateService = require('../services/climateService');
const anomalyService = require('../services/anomalyService');

// GET /api/v1/climate/forecast/:farmId — Get climate risk forecast
router.get('/forecast/:farmId', auth, async (req, res) => {
  try {
    const { horizon = 14 } = req.query; // days: 7, 14, 30, 90

    // Check cached forecast
    const cached = await pool.query(
      `SELECT * FROM climate_forecasts 
       WHERE farm_id = $1 AND forecast_horizon_days = $2 
       AND forecast_date >= CURRENT_DATE
       ORDER BY created_at DESC LIMIT 1`,
      [req.params.farmId, parseInt(horizon)]
    );

    if (cached.rows.length) {
      return res.json({ success: true, data: cached.rows[0], source: 'cache' });
    }

    // Get farm location
    const farm = await pool.query(
      'SELECT latitude, longitude, region, climate_zone FROM farm_identities WHERE id = $1',
      [req.params.farmId]
    );
    if (!farm.rows.length) return res.status(404).json({ success: false, error: 'Farm not found' });

    // Generate forecast
    const forecast = await climateService.generateForecast(
      farm.rows[0], parseInt(horizon)
    );

    // Store forecast
    const result = await pool.query(
      `INSERT INTO climate_forecasts 
       (farm_id, region, forecast_date, forecast_horizon_days, model_type, predictions, confidence_score)
       VALUES ($1,$2,CURRENT_DATE,$3,$4,$5,$6) RETURNING *`,
      [req.params.farmId, farm.rows[0].region, parseInt(horizon),
       forecast.model_type, JSON.stringify(forecast.predictions), forecast.confidence]
    );

    res.json({ success: true, data: result.rows[0], source: 'generated' });
  } catch (err) {
    console.error('Climate forecast error:', err);
    res.status(500).json({ success: false, error: 'Forecast generation failed' });
  }
});

// GET /api/v1/climate/risks/:farmId — Get risk scores summary
router.get('/risks/:farmId', auth, async (req, res) => {
  try {
    const forecast = await pool.query(
      `SELECT predictions FROM climate_forecasts 
       WHERE farm_id = $1 AND forecast_date >= CURRENT_DATE
       ORDER BY created_at DESC LIMIT 1`,
      [req.params.farmId]
    );

    const anomalies = await pool.query(
      `SELECT anomaly_type, severity, COUNT(*) as count 
       FROM anomaly_logs WHERE farm_id = $1 AND resolved = false
       GROUP BY anomaly_type, severity`,
      [req.params.farmId]
    );

    const risks = climateService.calculateRiskScores(
      forecast.rows[0]?.predictions || {},
      anomalies.rows
    );

    res.json({ success: true, data: risks });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Risk calculation failed' });
  }
});

// POST /api/v1/climate/anomaly-check — Run anomaly detection on sensor data
router.post('/anomaly-check', auth, async (req, res) => {
  try {
    const { farm_id, device_id, sensor_data } = req.body;

    const result = await anomalyService.detect(sensor_data);

    if (result.is_anomaly) {
      await pool.query(
        `INSERT INTO anomaly_logs 
         (farm_id, device_id, anomaly_type, severity, sensor_data, 
          detection_model, anomaly_score, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [farm_id, device_id, result.type, result.severity,
         JSON.stringify(sensor_data), 'isolation_forest',
         result.score, result.description]
      );
    }

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Anomaly detection failed' });
  }
});

// GET /api/v1/climate/anomalies/:farmId — Get anomaly history
router.get('/anomalies/:farmId', auth, async (req, res) => {
  try {
    const { resolved = 'false', limit = 50 } = req.query;
    const result = await pool.query(
      `SELECT * FROM anomaly_logs WHERE farm_id = $1 
       AND resolved = $2 ORDER BY created_at DESC LIMIT $3`,
      [req.params.farmId, resolved === 'true', parseInt(limit)]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch anomalies' });
  }
});

// PATCH /api/v1/climate/anomalies/:id/acknowledge
router.patch('/anomalies/:id/acknowledge', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE anomaly_logs SET acknowledged = true, acknowledged_by = $1, 
       acknowledged_at = NOW() WHERE id = $2 RETURNING *`,
      [req.user.id, req.params.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Acknowledge failed' });
  }
});

module.exports = router;

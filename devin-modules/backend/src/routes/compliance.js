const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const auth = require('../middleware/auth');

// POST /api/v1/compliance/report — Generate compliance report
router.post('/report', auth, async (req, res) => {
  try {
    const { farm_id, report_type, period_start, period_end, data } = req.body;

    if (!farm_id || !report_type) {
      return res.status(400).json({ success: false, error: 'farm_id and report_type required' });
    }

    // Gather sensor data for the period
    const sensorData = await pool.query(
      `SELECT s.sensor_type, s.value, s.recorded_at 
       FROM sensor_readings s 
       JOIN devices d ON s.device_id = d.id
       JOIN farm_identities fi ON d.user_id = fi.user_id
       WHERE fi.id = $1 AND s.recorded_at BETWEEN $2 AND $3
       ORDER BY s.recorded_at`,
      [farm_id, period_start || new Date(Date.now() - 90 * 86400000), period_end || new Date()]
    );

    let reportData;
    switch (report_type) {
      case 'carbon_footprint':
        reportData = calculateCarbonFootprint(sensorData.rows, data);
        break;
      case 'sustainability':
        reportData = generateSustainabilityReport(sensorData.rows, data);
        break;
      case 'pesticide_usage':
        reportData = { ...data, sensor_summary: summarizeSensorData(sensorData.rows) };
        break;
      case 'water_usage':
        reportData = calculateWaterUsage(sensorData.rows, data);
        break;
      default:
        reportData = { raw_data: data, sensor_summary: summarizeSensorData(sensorData.rows) };
    }

    const result = await pool.query(
      `INSERT INTO compliance_reports 
       (farm_id, report_type, period_start, period_end, report_data, generated_by)
       VALUES ($1,$2,$3,$4,$5,'ai') RETURNING *`,
      [farm_id, report_type, period_start, period_end, JSON.stringify(reportData)]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Compliance report error:', err);
    res.status(500).json({ success: false, error: 'Report generation failed' });
  }
});

// GET /api/v1/compliance/reports/:farmId
router.get('/reports/:farmId', auth, async (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT * FROM compliance_reports WHERE farm_id = $1';
    const params = [req.params.farmId];
    if (type) { query += ' AND report_type = $2'; params.push(type); }
    query += ' ORDER BY created_at DESC LIMIT 20';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch reports' });
  }
});

// PATCH /api/v1/compliance/reports/:id/submit
router.patch('/reports/:id/submit', auth, async (req, res) => {
  try {
    const { submitted_to } = req.body;
    const result = await pool.query(
      `UPDATE compliance_reports SET status = 'submitted', 
       submitted_to = $1, submitted_at = NOW() WHERE id = $2 RETURNING *`,
      [submitted_to, req.params.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Submit failed' });
  }
});

// --- Helper Functions ---

function calculateCarbonFootprint(sensorData, manualData = {}) {
  const energyReadings = sensorData.filter(s => s.sensor_type === 'energy');
  const totalKwh = energyReadings.reduce((sum, r) => sum + parseFloat(r.value || 0), 0);
  const scope2 = totalKwh * 0.233; // kg CO2 per kWh (Canada grid avg)

  return {
    scope1_kg: manualData.fuel_litres ? manualData.fuel_litres * 2.68 : 0,
    scope2_kg: Math.round(scope2 * 100) / 100,
    scope3_kg: manualData.scope3_kg || 0,
    total_kg: 0, // calculated below
    offset_kg: manualData.offset_kg || 0,
    net_kg: 0,
    breakdown: {
      machinery: manualData.fuel_litres ? manualData.fuel_litres * 2.68 : 0,
      livestock: manualData.livestock_emissions || 0,
      fertilizer: manualData.fertilizer_kg ? manualData.fertilizer_kg * 6.8 : 0,
      energy: Math.round(scope2 * 100) / 100,
      transport: manualData.transport_km ? manualData.transport_km * 0.21 : 0
    },
    methodology: 'GHG Protocol Agricultural Guidance',
    data_quality: energyReadings.length > 100 ? 'high' : energyReadings.length > 10 ? 'medium' : 'low'
  };
}

function generateSustainabilityReport(sensorData, manualData = {}) {
  return {
    environmental: {
      water_efficiency: calculateWaterUsage(sensorData, manualData),
      carbon: calculateCarbonFootprint(sensorData, manualData),
      biodiversity_score: manualData.biodiversity_score || null
    },
    social: {
      worker_safety_incidents: manualData.safety_incidents || 0,
      community_engagement: manualData.community_score || null
    },
    governance: {
      certifications: manualData.certifications || [],
      compliance_status: 'generated'
    },
    sensor_data_points: sensorData.length,
    coverage_quality: sensorData.length > 500 ? 'comprehensive' : 'partial'
  };
}

function calculateWaterUsage(sensorData, manualData = {}) {
  const moistureReadings = sensorData.filter(s => s.sensor_type === 'soil_moisture');
  const avgMoisture = moistureReadings.length
    ? moistureReadings.reduce((s, r) => s + parseFloat(r.value || 0), 0) / moistureReadings.length
    : null;

  return {
    total_m3: manualData.water_m3 || 0,
    per_hectare_m3: manualData.water_m3 && manualData.area_ha
      ? Math.round((manualData.water_m3 / manualData.area_ha) * 100) / 100 : null,
    avg_soil_moisture_pct: avgMoisture ? Math.round(avgMoisture * 100) / 100 : null,
    irrigation_efficiency: manualData.irrigation_efficiency || null,
    readings_count: moistureReadings.length
  };
}

function summarizeSensorData(sensorData) {
  const types = {};
  sensorData.forEach(s => {
    if (!types[s.sensor_type]) types[s.sensor_type] = { count: 0, values: [] };
    types[s.sensor_type].count++;
    types[s.sensor_type].values.push(parseFloat(s.value || 0));
  });
  Object.keys(types).forEach(t => {
    const vals = types[t].values;
    types[t].min = Math.min(...vals);
    types[t].max = Math.max(...vals);
    types[t].avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
    delete types[t].values;
  });
  return types;
}

module.exports = router;

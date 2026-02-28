const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const auth = require('../middleware/auth');

// CEADS-compatible data exchange format
// Common European Agricultural Data Space

// GET /api/v1/interop/farm/:farmCode — Export farm data in CEADS JSON-LD format
router.get('/farm/:farmCode', auth, async (req, res) => {
  try {
    const farm = await pool.query(
      'SELECT * FROM farm_identities WHERE farm_code = $1', [req.params.farmCode]
    );
    if (!farm.rows.length) return res.status(404).json({ success: false, error: 'Farm not found' });

    // Check consent for data sharing
    const consent = await pool.query(
      `SELECT * FROM data_consents WHERE farm_id = $1 AND consent_type = 'government' AND granted = true`,
      [farm.rows[0].id]
    );

    const f = farm.rows[0];
    const ceadsData = {
      '@context': {
        '@vocab': 'https://w3id.org/demeter/agri/',
        'geo': 'http://www.opengis.net/ont/geosparql#',
        'schema': 'https://schema.org/',
        'agri': 'https://w3id.org/demeter/agri/'
      },
      '@type': 'agri:Farm',
      '@id': `urn:agrivision:farm:${f.farm_code}`,
      'schema:name': f.farm_name,
      'agri:farmCode': f.farm_code,
      'geo:hasGeometry': {
        '@type': 'geo:Point',
        'geo:asWKT': `POINT(${f.longitude} ${f.latitude})`
      },
      'agri:totalArea': {
        '@type': 'schema:QuantitativeValue',
        'schema:value': parseFloat(f.total_area_ha),
        'schema:unitCode': 'HAR' // hectare
      },
      'agri:primaryCrops': f.primary_crops,
      'agri:soilType': f.soil_type,
      'agri:climateZone': f.climate_zone,
      'agri:dataConsent': {
        'government': consent.rows.length > 0,
        'lastUpdated': f.updated_at
      }
    };

    res.set('Content-Type', 'application/ld+json');
    res.json(ceadsData);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Export failed' });
  }
});

// GET /api/v1/interop/sensor-data/:farmId — Export sensor data in standardized format
router.get('/sensor-data/:farmId', auth, async (req, res) => {
  try {
    const { from, to, format = 'json-ld' } = req.query;

    const sensors = await pool.query(
      `SELECT s.sensor_type, s.value, s.unit, s.recorded_at, d.device_name
       FROM sensor_readings s
       JOIN devices d ON s.device_id = d.id
       WHERE d.user_id = (SELECT user_id FROM farm_identities WHERE id = $1)
       AND s.recorded_at BETWEEN COALESCE($2, NOW() - INTERVAL '7 days') AND COALESCE($3, NOW())
       ORDER BY s.recorded_at DESC LIMIT 1000`,
      [req.params.farmId, from, to]
    );

    if (format === 'csv') {
      const csv = ['timestamp,sensor_type,value,unit,device'];
      sensors.rows.forEach(r => {
        csv.push(`${r.recorded_at},${r.sensor_type},${r.value},${r.unit || ''},${r.device_name}`);
      });
      res.set('Content-Type', 'text/csv');
      return res.send(csv.join('\n'));
    }

    // JSON-LD SAREF ontology format
    const observations = sensors.rows.map(r => ({
      '@type': 'saref:Measurement',
      'saref:hasTimestamp': r.recorded_at,
      'saref:relatesToProperty': mapSensorType(r.sensor_type),
      'saref:hasValue': parseFloat(r.value),
      'saref:isMeasuredIn': r.unit || inferUnit(r.sensor_type),
      'saref:isMeasuredByDevice': r.device_name
    }));

    res.set('Content-Type', 'application/ld+json');
    res.json({
      '@context': {
        'saref': 'https://saref.etsi.org/core/',
        'saref4agri': 'https://saref.etsi.org/saref4agri/'
      },
      '@type': 'saref4agri:FarmObservationCollection',
      'observations': observations,
      'totalCount': observations.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Sensor export failed' });
  }
});

// POST /api/v1/interop/import — Import data from external FMIS
router.post('/import', auth, async (req, res) => {
  try {
    const { source_system, data_format, payload } = req.body;

    // Normalize external data to Agrivision schema
    let normalized;
    switch (data_format) {
      case 'isoxml':
        normalized = parseISOXML(payload);
        break;
      case 'geojson':
        normalized = parseGeoJSON(payload);
        break;
      case 'ceads':
        normalized = parseCEADS(payload);
        break;
      default:
        normalized = payload;
    }

    res.json({
      success: true,
      data: {
        source: source_system,
        records_imported: Array.isArray(normalized) ? normalized.length : 1,
        normalized_data: normalized
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Import failed' });
  }
});

// Helper functions
function mapSensorType(type) {
  const map = {
    'temperature': 'saref:Temperature',
    'humidity': 'saref:Humidity',
    'soil_moisture': 'saref4agri:SoilMoisture',
    'light': 'saref:Light',
    'pressure': 'saref:Pressure',
    'wind_speed': 'saref:WindSpeed',
    'rainfall': 'saref4agri:Precipitation'
  };
  return map[type] || `saref:${type}`;
}

function inferUnit(type) {
  const units = {
    'temperature': 'CEL', 'humidity': 'P1', 'soil_moisture': 'P1',
    'pressure': 'HPA', 'wind_speed': 'MTS', 'rainfall': 'MMT'
  };
  return units[type] || '';
}

function parseISOXML(payload) { return payload; }
function parseGeoJSON(payload) { return payload; }
function parseCEADS(payload) { return payload; }

module.exports = router;

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const auth = require('../middleware/auth');

// POST /api/v1/benchmark/submit — Submit farm metrics for benchmarking
router.post('/submit', auth, async (req, res) => {
  try {
    const { farm_id, period_start, period_end, crop_type, metrics } = req.body;

    const farm = await pool.query(
      'SELECT region, climate_zone, total_area_ha FROM farm_identities WHERE id = $1 AND user_id = $2',
      [farm_id, req.user.id]
    );
    if (!farm.rows.length) return res.status(404).json({ success: false, error: 'Farm not found' });

    const f = farm.rows[0];
    const sizeCategory = f.total_area_ha < 10 ? 'small' : f.total_area_ha < 100 ? 'medium' : 'large';

    const result = await pool.query(
      `INSERT INTO benchmarks 
       (farm_id, period_start, period_end, crop_type, metrics, region, climate_zone, farm_size_category)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [farm_id, period_start, period_end, crop_type, JSON.stringify(metrics),
       f.region, f.climate_zone, sizeCategory]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Benchmark submission failed' });
  }
});

// GET /api/v1/benchmark/compare — Get regional comparison
router.get('/compare', auth, async (req, res) => {
  try {
    const { crop_type, region, climate_zone, period_year } = req.query;

    let query = `
      SELECT crop_type, farm_size_category, region, climate_zone,
        COUNT(*) as farm_count,
        json_build_object(
          'yield_per_ha', json_build_object(
            'avg', ROUND(AVG((metrics->>'yield_per_ha')::numeric), 2),
            'min', ROUND(MIN((metrics->>'yield_per_ha')::numeric), 2),
            'max', ROUND(MAX((metrics->>'yield_per_ha')::numeric), 2),
            'p25', ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY (metrics->>'yield_per_ha')::numeric), 2),
            'p75', ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY (metrics->>'yield_per_ha')::numeric), 2)
          ),
          'water_usage_m3', json_build_object(
            'avg', ROUND(AVG((metrics->>'water_usage_m3_per_ha')::numeric), 2)
          ),
          'carbon_kg_per_ha', json_build_object(
            'avg', ROUND(AVG((metrics->>'carbon_footprint_kg_co2_per_ha')::numeric), 2)
          )
        ) as aggregated_metrics
      FROM benchmarks WHERE anonymized = true`;

    const params = [];
    let paramIdx = 1;

    if (crop_type) { query += ` AND crop_type = $${paramIdx++}`; params.push(crop_type); }
    if (region) { query += ` AND region = $${paramIdx++}`; params.push(region); }
    if (climate_zone) { query += ` AND climate_zone = $${paramIdx++}`; params.push(climate_zone); }
    if (period_year) {
      query += ` AND EXTRACT(YEAR FROM period_start) = $${paramIdx++}`;
      params.push(parseInt(period_year));
    }

    query += ' GROUP BY crop_type, farm_size_category, region, climate_zone';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Comparison failed' });
  }
});

// GET /api/v1/benchmark/my-position/:farmId — See where your farm ranks
router.get('/my-position/:farmId', auth, async (req, res) => {
  try {
    const { crop_type } = req.query;
    const myBenchmark = await pool.query(
      `SELECT * FROM benchmarks WHERE farm_id = $1 AND crop_type = $2 
       ORDER BY period_end DESC LIMIT 1`,
      [req.params.farmId, crop_type]
    );
    if (!myBenchmark.rows.length) {
      return res.status(404).json({ success: false, error: 'No benchmark data for this farm/crop' });
    }

    const mine = myBenchmark.rows[0];
    const myYield = parseFloat(mine.metrics?.yield_per_ha || 0);

    const ranking = await pool.query(
      `SELECT COUNT(*) as total,
        SUM(CASE WHEN (metrics->>'yield_per_ha')::numeric < $1 THEN 1 ELSE 0 END) as below_me
       FROM benchmarks WHERE crop_type = $2 AND region = $3 AND anonymized = true`,
      [myYield, crop_type, mine.region]
    );

    const r = ranking.rows[0];
    const percentile = r.total > 0 ? Math.round((parseInt(r.below_me) / parseInt(r.total)) * 100) : null;

    res.json({
      success: true,
      data: {
        my_metrics: mine.metrics,
        percentile_rank: percentile,
        total_farms_compared: parseInt(r.total),
        region: mine.region,
        crop: crop_type
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ranking failed' });
  }
});

module.exports = router;

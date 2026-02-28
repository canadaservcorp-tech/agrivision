const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const auth = require('../middleware/auth');
const crypto = require('crypto');

// ============================================
// PUBLIC — Partner Registration (no auth needed)
// ============================================

// POST /api/v1/franchise/apply — Submit franchise application
router.post('/apply', async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone, preferred_language,
      company_name, business_type, business_description,
      years_in_business, number_of_employees, annual_revenue_range,
      country, region, city, address,
      farm_size_ha, primary_crops, current_technology,
      interest_type, target_market, expected_coverage_area,
      why_interested, how_heard_about_us,
      website_url, linkedin_url
    } = req.body;

    // Validation
    if (!first_name || !last_name || !email || !business_type || !business_description || !country || !interest_type) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: first_name, last_name, email, business_type, business_description, country, interest_type'
      });
    }

    // Check duplicate email
    const existing = await pool.query(
      'SELECT id, status FROM franchise_partners WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (existing.rows.length) {
      const status = existing.rows[0].status;
      if (status === 'pending' || status === 'reviewing') {
        return res.status(409).json({
          success: false,
          error: 'An application with this email is already under review',
          application_id: existing.rows[0].id
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO franchise_partners 
       (first_name, last_name, email, phone, preferred_language,
        company_name, business_type, business_description,
        years_in_business, number_of_employees, annual_revenue_range,
        country, region, city, address,
        farm_size_ha, primary_crops, current_technology,
        interest_type, target_market, expected_coverage_area,
        why_interested, how_heard_about_us,
        website_url, linkedin_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
       RETURNING id, first_name, last_name, email, status, created_at`,
      [
        first_name.trim(), last_name.trim(), email.toLowerCase().trim(), phone,
        preferred_language || 'en', company_name, business_type,
        business_description, years_in_business, number_of_employees,
        annual_revenue_range, country, region, city, address,
        farm_size_ha, primary_crops || [], current_technology,
        interest_type, target_market, expected_coverage_area,
        why_interested, how_heard_about_us,
        website_url, linkedin_url
      ]
    );

    // TODO: Send notification email to partnerships@agrivision.ca
    // TODO: Send confirmation email to applicant

    res.status(201).json({
      success: true,
      data: {
        ...result.rows[0],
        message: 'Application received. Our team will review and contact you within 5-7 business days.'
      }
    });
  } catch (err) {
    console.error('Franchise application error:', err);
    res.status(500).json({ success: false, error: 'Application submission failed' });
  }
});

// GET /api/v1/franchise/status/:email — Check application status (public)
router.get('/status/:email', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, status, partner_code, created_at, reviewed_at
       FROM franchise_partners WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.params.email.toLowerCase().trim()]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'No application found for this email' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Status check failed' });
  }
});


// ============================================
// ADMIN — Partner Management (auth required)
// ============================================

// GET /api/v1/franchise/applications — List all applications
router.get('/applications', auth, async (req, res) => {
  try {
    const { status = 'all', country, page = 1, limit = 20 } = req.query;
    let query = 'SELECT * FROM franchise_partners';
    const params = [];
    const conditions = [];

    if (status !== 'all') { conditions.push(`status = $${params.length + 1}`); params.push(status); }
    if (country) { conditions.push(`country = $${params.length + 1}`); params.push(country); }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const result = await pool.query(query, params);

    // Count total
    let countQuery = 'SELECT COUNT(*) FROM franchise_partners';
    if (conditions.length) countQuery += ' WHERE ' + conditions.join(' AND ');
    const countResult = await pool.query(countQuery, params.slice(0, conditions.length));

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch applications' });
  }
});

// GET /api/v1/franchise/applications/:id — Get single application
router.get('/applications/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM franchise_partners WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Fetch failed' });
  }
});

// PATCH /api/v1/franchise/applications/:id/review — Approve or reject
router.patch('/applications/:id/review', auth, async (req, res) => {
  try {
    const { status, review_notes } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status must be approved or rejected' });
    }

    let partnerCode = null;
    if (status === 'approved') {
      const count = await pool.query("SELECT COUNT(*) FROM franchise_partners WHERE status = 'approved' OR status = 'active'");
      const num = parseInt(count.rows[0].count) + 1;
      partnerCode = `AGV-P-${String(num).padStart(4, '0')}`;
    }

    const result = await pool.query(
      `UPDATE franchise_partners SET 
        status = $1, review_notes = $2, reviewed_by = $3, reviewed_at = NOW(),
        partner_code = COALESCE($4, partner_code)
       WHERE id = $5 RETURNING *`,
      [status, review_notes, req.user.id, partnerCode, req.params.id]
    );

    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Not found' });

    // TODO: Send approval/rejection email to applicant

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Review failed' });
  }
});

// GET /api/v1/franchise/stats — Dashboard stats
router.get('/stats', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'reviewing' THEN 1 ELSE 0 END) as reviewing,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM franchise_partners
    `);

    const byCountry = await pool.query(`
      SELECT country, COUNT(*) as count 
      FROM franchise_partners GROUP BY country ORDER BY count DESC LIMIT 10
    `);

    const byType = await pool.query(`
      SELECT interest_type, COUNT(*) as count 
      FROM franchise_partners GROUP BY interest_type ORDER BY count DESC
    `);

    res.json({
      success: true,
      data: {
        summary: result.rows[0],
        by_country: byCountry.rows,
        by_type: byType.rows
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Stats failed' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const auth = require('../middleware/auth');
const certService = require('../services/certificationService');
const pdfService = require('../services/certificatePdfService');
const crypto = require('crypto');

// ============================================
// FARMER ENDPOINTS
// ============================================

// GET /api/v1/certification/eligibility/:farmId — Check if farm qualifies
router.get('/eligibility/:farmId', auth, async (req, res) => {
  try {
    const { certificate_type = 'disease_free', season } = req.query;

    // Verify farm ownership
    const farm = await pool.query(
      'SELECT * FROM farm_identities WHERE id = $1 AND user_id = $2',
      [req.params.farmId, req.user.id]
    );
    if (!farm.rows.length) return res.status(404).json({ success: false, error: 'Farm not found' });

    // Get criteria
    const criteria = await pool.query(
      'SELECT * FROM certification_criteria WHERE certificate_type = $1 AND active = true ORDER BY weight DESC',
      [certificate_type]
    );

    // Evaluate each criterion
    const evaluation = await certService.evaluateFarm(
      req.params.farmId, req.user.id, criteria.rows, season
    );

    res.json({
      success: true,
      data: {
        farm: farm.rows[0],
        certificate_type,
        eligible: evaluation.eligible,
        overall_score: evaluation.overall_score,
        criteria_results: evaluation.criteria_results,
        missing_criteria: evaluation.missing,
        recommendations: evaluation.recommendations
      }
    });
  } catch (err) {
    console.error('Eligibility check error:', err);
    res.status(500).json({ success: false, error: 'Eligibility check failed' });
  }
});

// POST /api/v1/certification/request — Request certificate issuance
router.post('/request', auth, async (req, res) => {
  try {
    const {
      farm_id, certificate_type = 'disease_free',
      certified_products, season,
      harvest_period_start, harvest_period_end,
      pesticide_compliance
    } = req.body;

    if (!farm_id || !certified_products?.length || !season) {
      return res.status(400).json({
        success: false,
        error: 'Required: farm_id, certified_products[], season'
      });
    }

    // Verify farm
    const farm = await pool.query(
      'SELECT * FROM farm_identities WHERE id = $1 AND user_id = $2',
      [farm_id, req.user.id]
    );
    if (!farm.rows.length) return res.status(404).json({ success: false, error: 'Farm not found' });

    // Check eligibility
    const criteria = await pool.query(
      'SELECT * FROM certification_criteria WHERE certificate_type = $1 AND active = true',
      [certificate_type]
    );

    const evaluation = await certService.evaluateFarm(
      farm_id, req.user.id, criteria.rows, season, { pesticide_compliance }
    );

    if (!evaluation.eligible) {
      return res.status(400).json({
        success: false,
        error: 'Farm does not meet certification criteria',
        data: {
          overall_score: evaluation.overall_score,
          missing: evaluation.missing,
          recommendations: evaluation.recommendations
        }
      });
    }

    // Get user info
    const user = await pool.query('SELECT first_name, last_name FROM users WHERE id = $1', [req.user.id]);
    const farmerName = user.rows[0] ? `${user.rows[0].first_name} ${user.rows[0].last_name}` : 'Unknown';

    // Generate certificate number
    const year = new Date().getFullYear();
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM green_certificates WHERE certificate_number LIKE $1",
      [`AGV-GC-${year}-%`]
    );
    const certNum = `AGV-GC-${year}-${String(parseInt(countResult.rows[0].count) + 1).padStart(4, '0')}`;

    // Generate verification hash
    const hashData = `${certNum}|${farm_id}|${req.user.id}|${season}|${process.env.CERT_SIGNING_SECRET || 'agrivision-secret'}`;
    const verificationHash = crypto.createHash('sha256').update(hashData).digest('hex');

    // Set validity period
    const validFrom = harvest_period_start ? new Date(harvest_period_start) : new Date();
    const validUntil = harvest_period_end ? new Date(harvest_period_end) : new Date(Date.now() + 365 * 86400000);

    const f = farm.rows[0];

    const result = await pool.query(
      `INSERT INTO green_certificates 
       (farm_id, user_id, certificate_number, certificate_type,
        farm_name, farmer_name, farm_location, farm_area_ha,
        certified_products, season, harvest_period_start, harvest_period_end,
        criteria_scores, overall_score,
        status, issued_at, valid_from, valid_until,
        qr_code_data, verification_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'issued',NOW(),$15,$16,$17,$18)
       RETURNING *`,
      [
        farm_id, req.user.id, certNum, certificate_type,
        f.farm_name, farmerName, `${f.region}, ${f.country_code}`, f.total_area_ha,
        certified_products, season, harvest_period_start, harvest_period_end,
        JSON.stringify(evaluation.criteria_scores), evaluation.overall_score,
        validFrom, validUntil,
        `https://agrivision.ca/verify/${certNum}`, verificationHash
      ]
    );

    // Generate PDF
    try {
      const pdfUrl = await pdfService.generateCertificatePdf(result.rows[0]);
      await pool.query('UPDATE green_certificates SET pdf_url = $1, status = $2 WHERE id = $3',
        [pdfUrl, 'active', result.rows[0].id]);
      result.rows[0].pdf_url = pdfUrl;
      result.rows[0].status = 'active';
    } catch (pdfErr) {
      console.error('PDF generation error (certificate still issued):', pdfErr);
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Certificate request error:', err);
    res.status(500).json({ success: false, error: 'Certificate issuance failed' });
  }
});

// GET /api/v1/certification/my-certificates — Farmer's certificates
router.get('/my-certificates', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM green_certificates WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Fetch failed' });
  }
});

// GET /api/v1/certification/:certId — Get certificate detail
router.get('/:certId', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM green_certificates WHERE id = $1 AND user_id = $2',
      [req.params.certId, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Fetch failed' });
  }
});

// GET /api/v1/certification/:certId/pdf — Download PDF
router.get('/:certId/pdf', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM green_certificates WHERE id = $1 AND user_id = $2',
      [req.params.certId, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Not found' });

    const pdfBuffer = await pdfService.generateCertificatePdfBuffer(result.rows[0]);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Agrivision-Certificate-${result.rows[0].certificate_number}.pdf"`,
    });
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ success: false, error: 'PDF generation failed' });
  }
});

// ============================================
// PUBLIC — Certificate Verification
// ============================================

// GET /api/v1/certification/verify/:certNumber — Public verification
router.get('/verify/:certNumber', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT certificate_number, certificate_type, farm_name, farmer_name,
              farm_location, certified_products, season, overall_score,
              status, issued_at, valid_from, valid_until, verification_hash
       FROM green_certificates WHERE certificate_number = $1`,
      [req.params.certNumber]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        verified: false,
        error: 'Certificate not found. It may be invalid or counterfeit.'
      });
    }

    const cert = result.rows[0];
    const now = new Date();
    const isExpired = new Date(cert.valid_until) < now;
    const isActive = cert.status === 'active' && !isExpired;

    res.json({
      success: true,
      verified: isActive,
      data: {
        certificate_number: cert.certificate_number,
        type: cert.certificate_type,
        farm_name: cert.farm_name,
        farmer_name: cert.farmer_name,
        location: cert.farm_location,
        products: cert.certified_products,
        season: cert.season,
        score: cert.overall_score,
        status: isExpired ? 'expired' : cert.status,
        issued: cert.issued_at,
        valid_from: cert.valid_from,
        valid_until: cert.valid_until,
        message: isActive
          ? 'This certificate is valid and verified by Agrivision.'
          : isExpired
            ? 'This certificate has expired.'
            : `This certificate status is: ${cert.status}`
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// ============================================
// ADMIN — Certificate Management
// ============================================

// PATCH /api/v1/certification/:certId/revoke — Revoke certificate
router.patch('/:certId/revoke', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await pool.query(
      `UPDATE green_certificates SET status = 'revoked', revoked_at = NOW(), 
       revocation_reason = $1 WHERE id = $2 RETURNING *`,
      [reason || 'Administrative decision', req.params.certId]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Revocation failed' });
  }
});

// GET /api/v1/certification/admin/all — All certificates (admin)
router.get('/admin/all', auth, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    let query = 'SELECT * FROM green_certificates';
    const params = [];
    if (status) { query += ' WHERE status = $1'; params.push(status); }
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Fetch failed' });
  }
});

module.exports = router;

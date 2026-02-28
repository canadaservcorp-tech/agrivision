const { pool } = require('../db');

/**
 * Data Consent Middleware
 * Checks if the farm has granted appropriate consent before sharing data.
 * Attach to routes that expose farm data externally.
 * Usage: router.get('/data/:farmId', auth, dataConsent('research'), handler)
 */
const dataConsent = (requiredConsentType) => {
  return async (req, res, next) => {
    try {
      const farmId = req.params.farmId || req.body.farm_id;
      if (!farmId) return next(); // No farm context, skip

      const consent = await pool.query(
        `SELECT * FROM data_consents 
         WHERE farm_id = $1 AND consent_type = $2 AND granted = true
         AND (valid_until IS NULL OR valid_until > NOW())
         AND revoked_at IS NULL
         LIMIT 1`,
        [farmId, requiredConsentType]
      );

      if (!consent.rows.length) {
        return res.status(403).json({
          success: false,
          error: 'data_consent_required',
          message: `Farm has not granted '${requiredConsentType}' data sharing consent`,
          consent_type: requiredConsentType,
          action: 'Request consent via POST /api/v1/farm-id/:id/consent'
        });
      }

      // Attach consent info to request for downstream use
      req.dataConsent = consent.rows[0];
      next();
    } catch (err) {
      console.error('Data consent check error:', err);
      next(); // Fail open for internal errors — log and monitor
    }
  };
};

module.exports = { dataConsent };

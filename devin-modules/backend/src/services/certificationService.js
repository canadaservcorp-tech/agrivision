const { pool } = require('../db');

class CertificationService {

  /**
   * Evaluate a farm against certification criteria
   * Pulls real data from disease scans, sensor readings, and compliance reports
   */
  async evaluateFarm(farmId, userId, criteria, season, manualInputs = {}) {
    const results = [];
    let totalWeight = 0;
    let weightedScore = 0;
    const missing = [];
    const recommendations = [];

    for (const criterion of criteria) {
      let score = 0;
      let passed = false;
      let detail = '';

      switch (criterion.data_source) {
        case 'disease_scans':
          ({ score, detail } = await this._evaluateDiseaseScans(farmId, userId, criterion, season));
          break;
        case 'sensor_data':
          ({ score, detail } = await this._evaluateSensorData(farmId, userId, criterion, season));
          break;
        case 'manual_input':
          ({ score, detail } = this._evaluateManualInput(criterion, manualInputs));
          break;
        case 'compliance_reports':
          ({ score, detail } = await this._evaluateCompliance(farmId, criterion));
          break;
        default:
          score = 0;
          detail = 'Unknown data source';
      }

      passed = score >= criterion.minimum_score;
      const weight = parseFloat(criterion.weight);
      totalWeight += weight;
      weightedScore += score * weight;

      results.push({
        criteria_name: criterion.criteria_name,
        description: criterion.description,
        score: Math.round(score * 100) / 100,
        minimum: parseFloat(criterion.minimum_score),
        weight,
        passed,
        detail
      });

      if (!passed) {
        missing.push({
          criteria: criterion.criteria_name,
          current_score: Math.round(score * 100) / 100,
          required: parseFloat(criterion.minimum_score),
          gap: Math.round((parseFloat(criterion.minimum_score) - score) * 100) / 100
        });

        recommendations.push(this._getRecommendation(criterion.criteria_name, score, criterion.minimum_score));
      }
    }

    const overallScore = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) / 100 : 0;
    const eligible = missing.length === 0 && overallScore >= 60;

    return {
      eligible,
      overall_score: overallScore,
      criteria_results: results,
      criteria_scores: this._buildScoresObject(results),
      missing,
      recommendations
    };
  }

  async _evaluateDiseaseScans(farmId, userId, criterion, season) {
    try {
      // Get disease detection results from alerts table
      // Assuming alerts with type 'disease' are stored in anomaly_logs or a dedicated table
      const dateRange = this._getSeasonDates(season);

      const totalScans = await pool.query(
        `SELECT COUNT(*) as total FROM anomaly_logs 
         WHERE farm_id = $1 AND created_at BETWEEN $2 AND $3`,
        [farmId, dateRange.start, dateRange.end]
      );

      const diseaseScans = await pool.query(
        `SELECT COUNT(*) as diseased FROM anomaly_logs 
         WHERE farm_id = $1 AND anomaly_type = 'disease' AND created_at BETWEEN $2 AND $3`,
        [farmId, dateRange.start, dateRange.end]
      );

      const total = parseInt(totalScans.rows[0].total) || 0;
      const diseased = parseInt(diseaseScans.rows[0].diseased) || 0;

      if (criterion.criteria_name === 'Disease Detection Score') {
        const cleanPct = total > 0 ? ((total - diseased) / total) * 100 : 0;
        return { score: cleanPct, detail: `${total - diseased}/${total} scans disease-free (${Math.round(cleanPct)}%)` };
      }

      if (criterion.criteria_name === 'Inspection Frequency') {
        return { score: total, detail: `${total} scans completed this season` };
      }

      if (criterion.criteria_name === 'Consecutive Clean Days') {
        // Calculate max consecutive clean days
        const alerts = await pool.query(
          `SELECT created_at::date as alert_date FROM anomaly_logs 
           WHERE farm_id = $1 AND anomaly_type = 'disease' AND created_at BETWEEN $2 AND $3
           ORDER BY created_at`,
          [farmId, dateRange.start, dateRange.end]
        );

        const diseaseDates = alerts.rows.map(r => new Date(r.alert_date));
        const totalDays = Math.ceil((dateRange.end - dateRange.start) / 86400000);
        let maxClean = totalDays; // If no diseases, all days are clean

        if (diseaseDates.length > 0) {
          maxClean = 0;
          let prevDate = dateRange.start;
          for (const d of diseaseDates) {
            const gap = Math.ceil((d - prevDate) / 86400000);
            maxClean = Math.max(maxClean, gap);
            prevDate = d;
          }
          maxClean = Math.max(maxClean, Math.ceil((dateRange.end - diseaseDates[diseaseDates.length - 1]) / 86400000));
        }

        return { score: maxClean, detail: `${maxClean} consecutive disease-free days` };
      }

      return { score: 0, detail: 'No scan data available' };
    } catch (err) {
      console.error('Disease scan evaluation error:', err);
      return { score: 0, detail: 'Error evaluating disease scans' };
    }
  }

  async _evaluateSensorData(farmId, userId, criterion, season) {
    try {
      const dateRange = this._getSeasonDates(season);

      if (criterion.criteria_name === 'Soil Health Score') {
        const readings = await pool.query(
          `SELECT AVG(CASE WHEN s.sensor_type = 'soil_moisture' THEN s.value::numeric END) as avg_moisture,
                  COUNT(*) as reading_count
           FROM sensor_readings s
           JOIN devices d ON s.device_id = d.id
           WHERE d.user_id = $1 AND s.recorded_at BETWEEN $2 AND $3`,
          [userId, dateRange.start, dateRange.end]
        );

        const moisture = parseFloat(readings.rows[0].avg_moisture) || 0;
        // Optimal soil moisture: 30-70%. Score based on proximity.
        const optimalMin = 30, optimalMax = 70;
        let score;
        if (moisture >= optimalMin && moisture <= optimalMax) {
          score = 100;
        } else if (moisture < optimalMin) {
          score = Math.max(0, (moisture / optimalMin) * 100);
        } else {
          score = Math.max(0, ((100 - moisture) / (100 - optimalMax)) * 100);
        }

        return { score, detail: `Avg soil moisture: ${Math.round(moisture)}%, score: ${Math.round(score)}` };
      }

      if (criterion.criteria_name === 'Water Management') {
        const readings = await pool.query(
          `SELECT 
            AVG(CASE WHEN s.sensor_type = 'soil_moisture' THEN s.value::numeric END) as avg_moisture,
            STDDEV(CASE WHEN s.sensor_type = 'soil_moisture' THEN s.value::numeric END) as std_moisture
           FROM sensor_readings s
           JOIN devices d ON s.device_id = d.id
           WHERE d.user_id = $1 AND s.recorded_at BETWEEN $2 AND $3`,
          [userId, dateRange.start, dateRange.end]
        );

        const std = parseFloat(readings.rows[0].std_moisture) || 30;
        // Low variability = good water management. Score inversely proportional to std dev.
        const score = Math.max(0, Math.min(100, 100 - std * 2));
        return { score, detail: `Moisture stability score: ${Math.round(score)} (std dev: ${Math.round(std)})` };
      }

      return { score: 0, detail: 'No sensor data available' };
    } catch (err) {
      return { score: 0, detail: 'Error reading sensor data' };
    }
  }

  _evaluateManualInput(criterion, inputs) {
    if (criterion.criteria_name === 'Pesticide Compliance') {
      const compliant = inputs.pesticide_compliance === true || inputs.pesticide_compliance === 'true';
      return {
        score: compliant ? 1 : 0,
        detail: compliant ? 'Farmer declared pesticide compliance' : 'Pesticide compliance not declared'
      };
    }
    return { score: 0, detail: 'Manual input not provided' };
  }

  async _evaluateCompliance(farmId, criterion) {
    try {
      const report = await pool.query(
        `SELECT report_data FROM compliance_reports 
         WHERE farm_id = $1 AND report_type = 'sustainability' 
         ORDER BY created_at DESC LIMIT 1`,
        [farmId]
      );

      if (!report.rows.length) return { score: 0, detail: 'No sustainability report on file' };

      const data = report.rows[0].report_data;
      const envScore = data?.environmental?.biodiversity_score || data?.environmental?.carbon?.data_quality === 'high' ? 80 : 50;
      return { score: envScore, detail: `Environmental score from sustainability report: ${envScore}` };
    } catch (err) {
      return { score: 0, detail: 'Error reading compliance data' };
    }
  }

  _getSeasonDates(season) {
    const year = parseInt(season?.split('_').pop()) || new Date().getFullYear();
    const seasonMap = {
      spring: { start: new Date(year, 2, 1), end: new Date(year, 5, 30) },
      summer: { start: new Date(year, 5, 1), end: new Date(year, 8, 30) },
      fall: { start: new Date(year, 8, 1), end: new Date(year, 11, 30) },
      winter: { start: new Date(year, 11, 1), end: new Date(year + 1, 2, 28) },
      full_year: { start: new Date(year, 0, 1), end: new Date(year, 11, 31) },
    };

    const key = season?.split('_')[0] || 'full_year';
    return seasonMap[key] || seasonMap.full_year;
  }

  _buildScoresObject(results) {
    const scores = {};
    results.forEach(r => {
      const key = r.criteria_name.toLowerCase().replace(/\s+/g, '_');
      scores[key] = r.score;
    });
    scores.overall_score = Math.round(results.reduce((sum, r) => sum + r.score * r.weight, 0) /
      results.reduce((sum, r) => sum + r.weight, 0) * 100) / 100;
    return scores;
  }

  _getRecommendation(criteriaName, currentScore, minimumScore) {
    const recs = {
      'Disease Detection Score': 'Increase camera scan frequency and address any detected issues promptly. Consider adding more camera modules for better coverage.',
      'Inspection Frequency': 'Schedule more regular AI scans. Minimum 12 scans per season for certification. Set up automated daily scans.',
      'Consecutive Clean Days': 'Focus on preventive treatments. Monitor weather forecasts for disease-favorable conditions. Use the advisory chatbot for guidance.',
      'Soil Health Score': 'Test and amend soil nutrients. Ensure proper drainage and organic matter content. Consider cover cropping.',
      'Water Management': 'Optimize irrigation scheduling using Agrivision sensor data. Reduce over/under watering variability.',
      'Pesticide Compliance': 'Declare pesticide usage compliance in your farm profile. Ensure all applications are within Agrivision guidelines.',
      'Environmental Score': 'Generate a sustainability report and improve environmental practices. Focus on biodiversity and carbon footprint reduction.',
    };
    return recs[criteriaName] || `Improve ${criteriaName} score from ${Math.round(currentScore)} to at least ${minimumScore}.`;
  }
}

module.exports = new CertificationService();

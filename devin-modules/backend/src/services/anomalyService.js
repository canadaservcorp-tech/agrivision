/**
 * Anomaly Detection Service
 * Uses statistical methods as a lightweight alternative to sklearn Isolation Forest.
 * For production LSTM/Isolation Forest, deploy the Python models in /ai/models/
 * and call them via HTTP from this service.
 */

class AnomalyService {

  constructor() {
    // Thresholds per sensor type — calibrate with real data
    this.thresholds = {
      temperature: { min: -10, max: 50, rate_of_change: 5 }, // °C, max change per hour
      humidity: { min: 10, max: 100, rate_of_change: 20 },    // %, max change per hour
      soil_moisture: { min: 0, max: 100, rate_of_change: 15 },
      pressure: { min: 950, max: 1050, rate_of_change: 10 },  // hPa
      wind_speed: { min: 0, max: 120, rate_of_change: 30 },   // km/h
      rainfall: { min: 0, max: 200, rate_of_change: 50 },     // mm/h
      light: { min: 0, max: 120000, rate_of_change: 50000 },  // lux
      battery: { min: 10, max: 100, rate_of_change: 5 }       // %
    };

    // Running stats for Z-score calculation (per device, per sensor)
    this.stats = new Map();
  }

  /**
   * Detect anomalies in sensor data
   * @param {Object} sensorData - { device_id, readings: [{ type, value, timestamp }] }
   * @returns {Object} - { is_anomaly, type, severity, score, description }
   */
  detect(sensorData) {
    const results = [];

    const readings = sensorData.readings || [];
    if (!readings.length) return { is_anomaly: false };

    for (const reading of readings) {
      const { type, value, timestamp } = reading;
      const numValue = parseFloat(value);

      if (isNaN(numValue)) continue;

      // 1. Threshold check
      const thresholdResult = this.checkThresholds(type, numValue);
      if (thresholdResult) results.push(thresholdResult);

      // 2. Z-score check (statistical outlier)
      const zScoreResult = this.checkZScore(sensorData.device_id, type, numValue);
      if (zScoreResult) results.push(zScoreResult);

      // 3. Rate of change check
      const rateResult = this.checkRateOfChange(sensorData.device_id, type, numValue, timestamp);
      if (rateResult) results.push(rateResult);

      // Update running stats
      this.updateStats(sensorData.device_id, type, numValue);
    }

    if (!results.length) return { is_anomaly: false };

    // Return the most severe anomaly
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    results.sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0));

    return {
      is_anomaly: true,
      ...results[0],
      all_anomalies: results
    };
  }

  checkThresholds(type, value) {
    const t = this.thresholds[type];
    if (!t) return null;

    if (value < t.min) {
      const severity = value < t.min * 0.5 ? 'critical' : value < t.min * 0.8 ? 'high' : 'medium';
      return {
        type: 'environmental',
        severity,
        score: Math.abs(value - t.min) / Math.abs(t.min || 1),
        description: `${type} reading ${value} is below minimum threshold ${t.min}`
      };
    }

    if (value > t.max) {
      const severity = value > t.max * 1.5 ? 'critical' : value > t.max * 1.2 ? 'high' : 'medium';
      return {
        type: 'environmental',
        severity,
        score: Math.abs(value - t.max) / Math.abs(t.max || 1),
        description: `${type} reading ${value} exceeds maximum threshold ${t.max}`
      };
    }

    return null;
  }

  checkZScore(deviceId, type, value) {
    const key = `${deviceId}:${type}`;
    const stats = this.stats.get(key);

    if (!stats || stats.count < 20) return null; // Need baseline data

    const mean = stats.sum / stats.count;
    const variance = (stats.sumSq / stats.count) - (mean * mean);
    const stdDev = Math.sqrt(Math.max(variance, 0.0001));
    const zScore = Math.abs((value - mean) / stdDev);

    if (zScore > 4) {
      return {
        type: 'environmental',
        severity: 'high',
        score: zScore / 5,
        description: `${type} value ${value} is ${zScore.toFixed(1)} standard deviations from mean ${mean.toFixed(1)}`
      };
    }

    if (zScore > 3) {
      return {
        type: 'environmental',
        severity: 'medium',
        score: zScore / 5,
        description: `${type} value ${value} is unusual (z-score: ${zScore.toFixed(1)})`
      };
    }

    return null;
  }

  checkRateOfChange(deviceId, type, value, timestamp) {
    const key = `${deviceId}:${type}:last`;
    const last = this.stats.get(key);
    const t = this.thresholds[type];

    if (!last || !t?.rate_of_change) {
      this.stats.set(key, { value, timestamp: new Date(timestamp).getTime() });
      return null;
    }

    const timeDiffHours = (new Date(timestamp).getTime() - last.timestamp) / 3600000;
    if (timeDiffHours <= 0 || timeDiffHours > 24) {
      this.stats.set(key, { value, timestamp: new Date(timestamp).getTime() });
      return null;
    }

    const changePerHour = Math.abs(value - last.value) / timeDiffHours;

    this.stats.set(key, { value, timestamp: new Date(timestamp).getTime() });

    if (changePerHour > t.rate_of_change * 2) {
      return {
        type: 'equipment',
        severity: 'high',
        score: changePerHour / t.rate_of_change,
        description: `${type} changed ${changePerHour.toFixed(1)}/hr — possible sensor malfunction or extreme event`
      };
    }

    if (changePerHour > t.rate_of_change) {
      return {
        type: 'environmental',
        severity: 'medium',
        score: changePerHour / t.rate_of_change,
        description: `Rapid ${type} change: ${changePerHour.toFixed(1)}/hr (threshold: ${t.rate_of_change}/hr)`
      };
    }

    return null;
  }

  updateStats(deviceId, type, value) {
    const key = `${deviceId}:${type}`;
    const stats = this.stats.get(key) || { count: 0, sum: 0, sumSq: 0 };

    stats.count++;
    stats.sum += value;
    stats.sumSq += value * value;

    // Keep window to last ~1000 readings (exponential moving average)
    if (stats.count > 1000) {
      stats.count = 1000;
      stats.sum = (stats.sum / stats.count) * 1000;
      stats.sumSq = (stats.sumSq / stats.count) * 1000;
    }

    this.stats.set(key, stats);
  }
}

module.exports = new AnomalyService();

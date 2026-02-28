const axios = require('axios');

class ClimateService {

  // Generate forecast using weather API + simple prediction models
  // In production, replace with trained LSTM model via Python microservice
  async generateForecast(farm, horizonDays) {
    try {
      // Fetch current weather data from Open-Meteo (free, no API key)
      const weatherData = await this.fetchWeatherData(farm.latitude, farm.longitude, horizonDays);

      // Calculate risk scores from weather predictions
      const predictions = this.analyzeWeatherRisks(weatherData, farm.climate_zone);

      return {
        model_type: 'statistical', // Switch to 'lstm' when Python model is deployed
        predictions,
        confidence: this.calculateConfidence(weatherData)
      };
    } catch (err) {
      console.error('Forecast generation error:', err);
      // Fallback: return baseline risks
      return {
        model_type: 'baseline',
        predictions: this.getBaselineRisks(farm.climate_zone),
        confidence: 0.3
      };
    }
  }

  async fetchWeatherData(lat, lon, days) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean,wind_speed_10m_max,et0_fao_evapotranspiration&forecast_days=${Math.min(days, 16)}&timezone=auto`;

    const response = await axios.get(url, { timeout: 10000 });
    return response.data;
  }

  analyzeWeatherRisks(weatherData, climateZone) {
    const daily = weatherData.daily || {};
    const days = daily.time?.length || 0;

    if (!days) return this.getBaselineRisks(climateZone);

    const tempMin = daily.temperature_2m_min || [];
    const tempMax = daily.temperature_2m_max || [];
    const precip = daily.precipitation_sum || [];
    const humidity = daily.relative_humidity_2m_mean || [];

    // Frost risk: any day below 0°C
    const frostDays = tempMin.filter(t => t <= 0).length;
    const frostRisk = Math.min(frostDays / days, 1.0);

    // Drought risk: consecutive days with <1mm rain
    let maxDryStreak = 0, currentStreak = 0;
    precip.forEach(p => {
      if (p < 1) { currentStreak++; maxDryStreak = Math.max(maxDryStreak, currentStreak); }
      else { currentStreak = 0; }
    });
    const droughtRisk = Math.min(maxDryStreak / 7, 1.0);

    // Flood risk: any day with >30mm
    const heavyRainDays = precip.filter(p => p > 30).length;
    const floodRisk = Math.min(heavyRainDays / 3, 1.0);

    // Heat stress: days above 35°C
    const heatDays = tempMax.filter(t => t > 35).length;
    const heatStressRisk = Math.min(heatDays / days, 1.0);

    // Disease risk: high humidity + moderate temp = fungal disease conditions
    let diseaseRiskDays = 0;
    for (let i = 0; i < days; i++) {
      if ((humidity[i] || 0) > 80 && (tempMax[i] || 0) > 15 && (tempMax[i] || 0) < 30) {
        diseaseRiskDays++;
      }
    }
    const diseaseRisk = Math.min(diseaseRiskDays / days, 1.0);

    return {
      daily_forecasts: daily.time?.map((date, i) => ({
        date,
        temp_min: tempMin[i],
        temp_max: tempMax[i],
        precipitation_mm: precip[i],
        humidity_pct: humidity[i]
      })) || [],
      risk_scores: {
        frost_risk: Math.round(frostRisk * 100) / 100,
        drought_risk: Math.round(droughtRisk * 100) / 100,
        flood_risk: Math.round(floodRisk * 100) / 100,
        heat_stress_risk: Math.round(heatStressRisk * 100) / 100,
        disease_risk: Math.round(diseaseRisk * 100) / 100,
        overall_risk: Math.round(
          ((frostRisk + droughtRisk + floodRisk + heatStressRisk + diseaseRisk) / 5) * 100
        ) / 100
      },
      summary: {
        avg_temp: Math.round((tempMax.reduce((a, b) => a + b, 0) / days + tempMin.reduce((a, b) => a + b, 0) / days) / 2 * 10) / 10,
        total_precip: Math.round(precip.reduce((a, b) => a + b, 0) * 10) / 10,
        frost_days: frostDays,
        heavy_rain_days: heavyRainDays,
        dry_streak_max: maxDryStreak
      }
    };
  }

  calculateRiskScores(predictions, anomalies) {
    const risks = predictions?.risk_scores || {};
    const anomalyBoost = {};

    // Boost risk scores based on active anomalies
    (anomalies || []).forEach(a => {
      const severityWeight = { low: 0.05, medium: 0.1, high: 0.2, critical: 0.4 };
      const weight = (severityWeight[a.severity] || 0) * parseInt(a.count);
      anomalyBoost[a.anomaly_type] = (anomalyBoost[a.anomaly_type] || 0) + weight;
    });

    return {
      climate_risks: risks,
      anomaly_risks: anomalyBoost,
      combined_risk: Math.min(
        (risks.overall_risk || 0) + Object.values(anomalyBoost).reduce((a, b) => a + b, 0) * 0.1,
        1.0
      )
    };
  }

  calculateConfidence(weatherData) {
    const days = weatherData?.daily?.time?.length || 0;
    if (days <= 3) return 0.9;
    if (days <= 7) return 0.75;
    if (days <= 14) return 0.6;
    return 0.45;
  }

  getBaselineRisks(climateZone) {
    return {
      daily_forecasts: [],
      risk_scores: {
        frost_risk: 0.1, drought_risk: 0.1, flood_risk: 0.05,
        heat_stress_risk: 0.05, disease_risk: 0.15, overall_risk: 0.09
      },
      summary: { note: 'Baseline estimates — no weather data available' }
    };
  }
}

module.exports = new ClimateService();

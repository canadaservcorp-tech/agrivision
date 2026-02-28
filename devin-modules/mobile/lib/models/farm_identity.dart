// ============================================================
// FARM IDENTITY MODEL
// ============================================================
class FarmIdentity {
  final String id;
  final String userId;
  final String farmCode;
  final String farmName;
  final String countryCode;
  final String region;
  final double latitude;
  final double longitude;
  final double totalAreaHa;
  final List<String> primaryCrops;
  final String? soilType;
  final String? climateZone;
  final bool ceadsCompatible;
  final DateTime createdAt;

  FarmIdentity({
    required this.id, required this.userId, required this.farmCode,
    required this.farmName, required this.countryCode, required this.region,
    required this.latitude, required this.longitude, required this.totalAreaHa,
    required this.primaryCrops, this.soilType, this.climateZone,
    this.ceadsCompatible = false, required this.createdAt,
  });

  factory FarmIdentity.fromJson(Map<String, dynamic> json) => FarmIdentity(
    id: json['id'] ?? '',
    userId: json['user_id'] ?? '',
    farmCode: json['farm_code'] ?? '',
    farmName: json['farm_name'] ?? '',
    countryCode: json['country_code'] ?? '',
    region: json['region'] ?? '',
    latitude: (json['latitude'] ?? 0).toDouble(),
    longitude: (json['longitude'] ?? 0).toDouble(),
    totalAreaHa: (json['total_area_ha'] ?? 0).toDouble(),
    primaryCrops: List<String>.from(json['primary_crops'] ?? []),
    soilType: json['soil_type'],
    climateZone: json['climate_zone'],
    ceadsCompatible: json['ceads_compatible'] ?? false,
    createdAt: DateTime.parse(json['created_at'] ?? DateTime.now().toIso8601String()),
  );

  Map<String, dynamic> toJson() => {
    'farm_name': farmName, 'country_code': countryCode, 'region': region,
    'latitude': latitude, 'longitude': longitude, 'total_area_ha': totalAreaHa,
    'primary_crops': primaryCrops, 'soil_type': soilType, 'climate_zone': climateZone,
  };
}

// ============================================================
// CLIMATE FORECAST MODEL
// ============================================================
class ClimateForecast {
  final String id;
  final String? farmId;
  final String? region;
  final DateTime forecastDate;
  final int horizonDays;
  final String modelType;
  final Map<String, dynamic> predictions;
  final double confidenceScore;

  ClimateForecast({
    required this.id, this.farmId, this.region, required this.forecastDate,
    required this.horizonDays, required this.modelType,
    required this.predictions, required this.confidenceScore,
  });

  factory ClimateForecast.fromJson(Map<String, dynamic> json) => ClimateForecast(
    id: json['id'] ?? '',
    farmId: json['farm_id'],
    region: json['region'],
    forecastDate: DateTime.parse(json['forecast_date'] ?? DateTime.now().toIso8601String()),
    horizonDays: json['forecast_horizon_days'] ?? 14,
    modelType: json['model_type'] ?? 'statistical',
    predictions: json['predictions'] ?? {},
    confidenceScore: (json['confidence_score'] ?? 0).toDouble(),
  );

  Map<String, dynamic>? get riskScores => predictions['risk_scores'];
  List<dynamic>? get dailyForecasts => predictions['daily_forecasts'];
  double get overallRisk => (riskScores?['overall_risk'] ?? 0).toDouble();
}

// ============================================================
// ANOMALY LOG MODEL
// ============================================================
class AnomalyLog {
  final String id;
  final String? farmId;
  final String anomalyType;
  final String severity;
  final Map<String, dynamic> sensorData;
  final double anomalyScore;
  final String? description;
  final bool acknowledged;
  final bool resolved;
  final DateTime createdAt;

  AnomalyLog({
    required this.id, this.farmId, required this.anomalyType,
    required this.severity, required this.sensorData, required this.anomalyScore,
    this.description, this.acknowledged = false, this.resolved = false,
    required this.createdAt,
  });

  factory AnomalyLog.fromJson(Map<String, dynamic> json) => AnomalyLog(
    id: json['id'] ?? '',
    farmId: json['farm_id'],
    anomalyType: json['anomaly_type'] ?? '',
    severity: json['severity'] ?? 'low',
    sensorData: json['sensor_data'] ?? {},
    anomalyScore: (json['anomaly_score'] ?? 0).toDouble(),
    description: json['description'],
    acknowledged: json['acknowledged'] ?? false,
    resolved: json['resolved'] ?? false,
    createdAt: DateTime.parse(json['created_at'] ?? DateTime.now().toIso8601String()),
  );
}

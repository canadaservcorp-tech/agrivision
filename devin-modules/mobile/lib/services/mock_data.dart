/// Mock data service - provides realistic demo data for all screens.
/// Replace with real API calls when backend is deployed.

import 'dart:math';

class MockData {
  static final _rng = Random(42);

  // ======================== USER ========================
  static Map<String, dynamic> get user => {
    'id': 1,
    'name': 'Hicham Zein Eddine',
    'email': 'info@theagrivision.com',
    'phone': '+971501234567',
    'country': 'AE',
    'language': 'en',
    'role': 'farmer',
    'farm_count': 2,
    'created_at': '2026-01-15',
  };

  // ======================== FARMS ========================
  static List<Map<String, dynamic>> get farms => [
    {
      'id': 1,
      'name': 'Al-Rashidi Date Farm',
      'location': 'Al Ain, Abu Dhabi',
      'area_hectares': 8.5,
      'crop_type': 'Date Palm',
      'cameras': 12,
      'sensors': 4,
      'created_at': '2026-01-20',
      'lat': 24.2075,
      'lng': 55.7447,
    },
    {
      'id': 2,
      'name': 'Dubai Greenhouse Complex',
      'location': 'Dubai Industrial City',
      'area_hectares': 2.3,
      'crop_type': 'Tomatoes',
      'cameras': 6,
      'sensors': 2,
      'created_at': '2026-02-01',
      'lat': 24.9434,
      'lng': 55.1767,
    },
  ];

  // ======================== DASHBOARD ========================
  static Map<String, dynamic> get dashboardOverview => {
    'active_alerts': 3,
    'detections_today': 7,
    'images_today': 342,
    'avg_temp': 38.4,
    'avg_humidity': 45,
    'avg_soil': 62,
    'avg_light': 78500,
    'cameras_total': 18,
    'cameras_online': 16,
    'cameras_offline': 2,
    'uptime_percent': 96.8,
    'last_24h_detections': _last24hDetections(),
    'weekly_trend': _weeklyTrend(),
  };

  static List<Map<String, dynamic>> _last24hDetections() {
    return List.generate(24, (i) {
      return {'hour': i, 'count': _rng.nextInt(5)};
    });
  }

  static List<Map<String, dynamic>> _weeklyTrend() {
    final days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((d) => {'day': d, 'detections': _rng.nextInt(12) + 1, 'images': _rng.nextInt(400) + 100}).toList();
  }

  // ======================== DETECTIONS ========================
  static List<Map<String, dynamic>> get detections => [
    {
      'id': 1, 'disease_name': 'Bayoud Disease', 'crop': 'Date Palm',
      'severity': 'critical', 'confidence': 0.94,
      'camera_serial': 'CAM-A3F7C001', 'farm_name': 'Al-Rashidi Date Farm',
      'detected_at': '2026-02-28 09:14', 'image_url': null,
      'treatment': 'Immediate removal of infected palms. Apply Trichoderma-based biocontrol. Quarantine 50m radius. Soil solarization recommended.',
    },
    {
      'id': 2, 'disease_name': 'Red Palm Weevil', 'crop': 'Date Palm',
      'severity': 'high', 'confidence': 0.89,
      'camera_serial': 'CAM-A3F7C004', 'farm_name': 'Al-Rashidi Date Farm',
      'detected_at': '2026-02-28 08:47', 'image_url': null,
      'treatment': 'Install pheromone traps. Inject Imidacloprid solution into trunk. Inspect neighboring palms within 100m.',
    },
    {
      'id': 3, 'disease_name': 'Early Blight', 'crop': 'Tomato',
      'severity': 'medium', 'confidence': 0.82,
      'camera_serial': 'CAM-B2E1D001', 'farm_name': 'Dubai Greenhouse Complex',
      'detected_at': '2026-02-28 07:33', 'image_url': null,
      'treatment': 'Apply copper-based fungicide. Remove affected lower leaves. Improve air circulation in greenhouse.',
    },
    {
      'id': 4, 'disease_name': 'Leaf Spot', 'crop': 'Date Palm',
      'severity': 'low', 'confidence': 0.76,
      'camera_serial': 'CAM-A3F7C007', 'farm_name': 'Al-Rashidi Date Farm',
      'detected_at': '2026-02-27 16:22', 'image_url': null,
      'treatment': 'Monitor for 48 hours. Apply neem oil if spreading. No immediate action required.',
    },
    {
      'id': 5, 'disease_name': 'Powdery Mildew', 'crop': 'Tomato',
      'severity': 'medium', 'confidence': 0.87,
      'camera_serial': 'CAM-B2E1D003', 'farm_name': 'Dubai Greenhouse Complex',
      'detected_at': '2026-02-27 14:05', 'image_url': null,
      'treatment': 'Apply sulfur-based fungicide. Reduce humidity below 60%. Increase spacing between plants.',
    },
    {
      'id': 6, 'disease_name': 'Spider Mites', 'crop': 'Tomato',
      'severity': 'high', 'confidence': 0.91,
      'camera_serial': 'CAM-B2E1D002', 'farm_name': 'Dubai Greenhouse Complex',
      'detected_at': '2026-02-27 11:58', 'image_url': null,
      'treatment': 'Release predatory mites (Phytoseiulus). Apply miticide if severe. Increase humidity to slow spread.',
    },
    {
      'id': 7, 'disease_name': 'Fusarium Wilt', 'crop': 'Date Palm',
      'severity': 'critical', 'confidence': 0.96,
      'camera_serial': 'CAM-A3F7C002', 'farm_name': 'Al-Rashidi Date Farm',
      'detected_at': '2026-02-26 15:40', 'image_url': null,
      'treatment': 'URGENT: Isolate affected palm immediately. Soil fumigation with metam sodium. Report to agricultural authority.',
    },
  ];

  // ======================== CAMERAS ========================
  static List<Map<String, dynamic>> get cameras => [
    {'serial': 'CAM-A3F7C001', 'online': true, 'battery': 87, 'rssi': -52, 'images_today': 28, 'detections_today': 2, 'firmware': '1.2.0', 'zone': 'North Field', 'sd_buffered': 0, 'last_image_ago': '3 min'},
    {'serial': 'CAM-A3F7C002', 'online': true, 'battery': 94, 'rssi': -48, 'images_today': 31, 'detections_today': 1, 'firmware': '1.2.0', 'zone': 'North Field', 'sd_buffered': 0, 'last_image_ago': '5 min'},
    {'serial': 'CAM-A3F7C003', 'online': true, 'battery': 62, 'rssi': -67, 'images_today': 25, 'detections_today': 0, 'firmware': '1.2.0', 'zone': 'East Field', 'sd_buffered': 0, 'last_image_ago': '2 min'},
    {'serial': 'CAM-A3F7C004', 'online': true, 'battery': 43, 'rssi': -71, 'images_today': 22, 'detections_today': 1, 'firmware': '1.1.0', 'zone': 'East Field', 'sd_buffered': 3, 'last_image_ago': '8 min'},
    {'serial': 'CAM-A3F7C005', 'online': false, 'battery': 12, 'rssi': -89, 'images_today': 0, 'detections_today': 0, 'firmware': '1.1.0', 'zone': 'South Field', 'sd_buffered': 47, 'last_image_ago': '2 hrs'},
    {'serial': 'CAM-A3F7C006', 'online': true, 'battery': 78, 'rssi': -55, 'images_today': 30, 'detections_today': 0, 'firmware': '1.2.0', 'zone': 'South Field', 'sd_buffered': 0, 'last_image_ago': '1 min'},
    {'serial': 'CAM-A3F7C007', 'online': true, 'battery': 91, 'rssi': -44, 'images_today': 33, 'detections_today': 1, 'firmware': '1.2.0', 'zone': 'West Field', 'sd_buffered': 0, 'last_image_ago': '4 min'},
    {'serial': 'CAM-A3F7C008', 'online': true, 'battery': 55, 'rssi': -63, 'images_today': 27, 'detections_today': 0, 'firmware': '1.2.0', 'zone': 'West Field', 'sd_buffered': 0, 'last_image_ago': '6 min'},
    {'serial': 'CAM-B2E1D001', 'online': true, 'battery': 99, 'rssi': -38, 'images_today': 45, 'detections_today': 1, 'firmware': '1.2.0', 'zone': 'Greenhouse A', 'sd_buffered': 0, 'last_image_ago': '1 min'},
    {'serial': 'CAM-B2E1D002', 'online': true, 'battery': 96, 'rssi': -41, 'images_today': 42, 'detections_today': 2, 'firmware': '1.2.0', 'zone': 'Greenhouse A', 'sd_buffered': 0, 'last_image_ago': '2 min'},
    {'serial': 'CAM-B2E1D003', 'online': true, 'battery': 88, 'rssi': -45, 'images_today': 39, 'detections_today': 1, 'firmware': '1.2.0', 'zone': 'Greenhouse B', 'sd_buffered': 0, 'last_image_ago': '3 min'},
    {'serial': 'CAM-A3F7C009', 'online': false, 'battery': 5, 'rssi': 0, 'images_today': 0, 'detections_today': 0, 'firmware': '1.0.0', 'zone': 'North Field', 'sd_buffered': 112, 'last_image_ago': '6 hrs'},
  ];

  // ======================== SENSORS ========================
  static List<Map<String, dynamic>> get sensorReadings {
    return List.generate(24, (i) {
      return {
        'hour': '${i.toString().padLeft(2, '0')}:00',
        'temperature': 25.0 + _rng.nextDouble() * 18 + (i > 10 && i < 16 ? 8 : 0),
        'humidity': 30.0 + _rng.nextDouble() * 30 - (i > 10 && i < 16 ? 10 : 0),
        'soil_moisture': 50.0 + _rng.nextDouble() * 25,
        'light_lux': i > 6 && i < 19 ? 20000 + _rng.nextInt(60000) : _rng.nextInt(100),
      };
    });
  }

  static Map<String, dynamic> get currentSensors => {
    'temperature': 38.4,
    'humidity': 45,
    'soil_moisture': 62,
    'light_lux': 78500,
    'wind_speed': 12.3,
    'rain_mm': 0.0,
    'uv_index': 9,
    'pressure_hpa': 1013,
  };

  // ======================== NOTIFICATIONS ========================
  static List<Map<String, dynamic>> get notifications => [
    {'id': 1, 'type': 'alert', 'title': '🚨 Bayoud Disease — Critical', 'message': 'Detected on CAM-A3F7C001 in North Field with 94% confidence.', 'time': '9:14 AM', 'read': false},
    {'id': 2, 'type': 'alert', 'title': '🟠 Red Palm Weevil — High', 'message': 'Detected on CAM-A3F7C004 in East Field with 89% confidence.', 'time': '8:47 AM', 'read': false},
    {'id': 3, 'type': 'system', 'title': '📷 CAM-A3F7C005 Offline', 'message': 'Camera in South Field went offline. Battery: 12%. Last contact 2 hours ago.', 'time': '7:30 AM', 'read': false},
    {'id': 4, 'type': 'alert', 'title': '🟡 Early Blight — Medium', 'message': 'Detected on CAM-B2E1D001 in Greenhouse A. Treatment suggested.', 'time': '7:33 AM', 'read': true},
    {'id': 5, 'type': 'system', 'title': '✅ Weekly Report Ready', 'message': 'Your farm report for Feb 17-23 is ready to download.', 'time': 'Yesterday', 'read': true},
    {'id': 6, 'type': 'system', 'title': '🔄 Firmware Update Available', 'message': 'v1.2.0 available for 2 cameras. OTA update scheduled for tonight.', 'time': 'Yesterday', 'read': true},
    {'id': 7, 'type': 'info', 'title': '🌱 New Crop Added', 'message': 'Tomato variety "Abu Dhabi Red" added to your greenhouse crop list.', 'time': '2 days ago', 'read': true},
  ];

  // ======================== REPORTS ========================
  static List<Map<String, dynamic>> get weeklyReports => [
    {'id': 1, 'period': 'Feb 21-27, 2026', 'detections': 23, 'images': 2847, 'uptime': 96.8, 'health_score': 91},
    {'id': 2, 'period': 'Feb 14-20, 2026', 'detections': 18, 'images': 3012, 'uptime': 98.2, 'health_score': 94},
    {'id': 3, 'period': 'Feb 7-13, 2026', 'detections': 31, 'images': 2654, 'uptime': 94.1, 'health_score': 87},
    {'id': 4, 'period': 'Jan 31 - Feb 6, 2026', 'detections': 12, 'images': 2901, 'uptime': 99.1, 'health_score': 96},
  ];
}

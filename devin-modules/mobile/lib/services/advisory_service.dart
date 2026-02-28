import 'dart:convert';
import 'package:http/http.dart' as http;

const String _baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://localhost:3000');

// ============================================================
// ADVISORY SERVICE — GenAI chatbot API client
// ============================================================
class AdvisoryService {
  String? _authToken;

  void setToken(String token) => _authToken = token;

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_authToken != null) 'Authorization': 'Bearer $_authToken',
  };

  Future<Map<String, dynamic>> sendMessage({
    required String message,
    String? chatId,
    String? farmId,
    String language = 'en',
  }) async {
    final res = await http.post(
      Uri.parse('$_baseUrl/api/v1/advisory/chat'),
      headers: _headers,
      body: jsonEncode({
        'message': message,
        'chat_id': chatId,
        'farm_id': farmId,
        'language': language,
      }),
    );

    if (res.statusCode != 200) throw Exception('Advisory chat failed: ${res.statusCode}');
    final data = jsonDecode(res.body);
    if (data['success'] != true) throw Exception(data['error'] ?? 'Unknown error');
    return data['data'];
  }

  Future<Map<String, dynamic>?> getChat(String chatId) async {
    final res = await http.get(Uri.parse('$_baseUrl/api/v1/advisory/chat/$chatId'), headers: _headers);
    if (res.statusCode != 200) return null;
    final data = jsonDecode(res.body);
    return data['data'];
  }

  Future<List<Map<String, dynamic>>> getHistory() async {
    final res = await http.get(Uri.parse('$_baseUrl/api/v1/advisory/history'), headers: _headers);
    if (res.statusCode != 200) return [];
    final data = jsonDecode(res.body);
    return List<Map<String, dynamic>>.from(data['data'] ?? []);
  }
}

// ============================================================
// CLIMATE SERVICE — Risk & forecast API client
// ============================================================
class ClimateService {
  String? _authToken;

  void setToken(String token) => _authToken = token;

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_authToken != null) 'Authorization': 'Bearer $_authToken',
  };

  Future<Map<String, dynamic>?> getRiskScores(String farmId) async {
    final res = await http.get(Uri.parse('$_baseUrl/api/v1/climate/risks/$farmId'), headers: _headers);
    if (res.statusCode != 200) return null;
    return jsonDecode(res.body)['data'];
  }

  Future<Map<String, dynamic>?> getForecast(String farmId, int horizon) async {
    final res = await http.get(
      Uri.parse('$_baseUrl/api/v1/climate/forecast/$farmId?horizon=$horizon'),
      headers: _headers,
    );
    if (res.statusCode != 200) return null;
    return jsonDecode(res.body)['data'];
  }

  Future<List<dynamic>?> getAnomalies(String farmId) async {
    final res = await http.get(Uri.parse('$_baseUrl/api/v1/climate/anomalies/$farmId'), headers: _headers);
    if (res.statusCode != 200) return null;
    return jsonDecode(res.body)['data'];
  }

  Future<void> acknowledgeAnomaly(String anomalyId) async {
    await http.patch(
      Uri.parse('$_baseUrl/api/v1/climate/anomalies/$anomalyId/acknowledge'),
      headers: _headers,
    );
  }

  Future<Map<String, dynamic>?> runAnomalyCheck(String farmId, String deviceId, Map<String, dynamic> sensorData) async {
    final res = await http.post(
      Uri.parse('$_baseUrl/api/v1/climate/anomaly-check'),
      headers: _headers,
      body: jsonEncode({'farm_id': farmId, 'device_id': deviceId, 'sensor_data': sensorData}),
    );
    if (res.statusCode != 200) return null;
    return jsonDecode(res.body)['data'];
  }
}

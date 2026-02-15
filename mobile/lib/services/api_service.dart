import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  // TODO: Replace with your Railway backend URL after Phase 2 deploy
  static const String baseUrl = 'https://YOUR-BACKEND.up.railway.app/api/v1';
  static const _storage = FlutterSecureStorage();

  static Future<String?> getToken() => _storage.read(key: 'token');
  static Future<void> setToken(String t) => _storage.write(key: 'token', value: t);
  static Future<void> clearToken() => _storage.delete(key: 'token');

  static Future<Map<String, String>> _headers() async {
    final t = await getToken();
    return {'Content-Type': 'application/json', if (t != null) 'Authorization': 'Bearer $t'};
  }

  static Future<Map<String, dynamic>> login(String email, String password) async {
    final r = await http.post(Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}));
    if (r.statusCode == 200) {
      final d = jsonDecode(r.body);
      await setToken(d['token']);
      return d;
    }
    throw Exception(jsonDecode(r.body)['error'] ?? 'Login failed');
  }

  static Future<Map<String, dynamic>> register(String name, String email, String password, String role) async {
    final r = await http.post(Uri.parse('$baseUrl/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'name': name, 'email': email, 'password': password, 'role': role}));
    if (r.statusCode == 201) {
      final d = jsonDecode(r.body);
      await setToken(d['token']);
      return d;
    }
    throw Exception(jsonDecode(r.body)['error'] ?? 'Registration failed');
  }

  static Future<List<dynamic>> getDevices() async {
    final r = await http.get(Uri.parse('$baseUrl/devices'), headers: await _headers());
    if (r.statusCode == 200) return jsonDecode(r.body);
    throw Exception('Failed to load devices');
  }

  static Future<List<dynamic>> getReadings(int deviceId, {int limit = 100}) async {
    final r = await http.get(Uri.parse('$baseUrl/readings/device/$deviceId?limit=$limit'), headers: await _headers());
    if (r.statusCode == 200) return jsonDecode(r.body);
    throw Exception('Failed to load readings');
  }

  static Future<List<dynamic>> getAlerts() async {
    final r = await http.get(Uri.parse('$baseUrl/alerts'), headers: await _headers());
    if (r.statusCode == 200) return jsonDecode(r.body);
    throw Exception('Failed to load alerts');
  }
}

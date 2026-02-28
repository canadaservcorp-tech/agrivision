import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  static final ApiService _instance = ApiService._();
  factory ApiService() => _instance;

  late final Dio _dio;
  final _storage = const FlutterSecureStorage();

  static const baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://api.theagrivision.com',
  );

  ApiService._() {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'token');
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
        handler.next(options);
      },
      onError: (error, handler) {
        if (error.response?.statusCode == 401) {
          _storage.delete(key: 'token');
        }
        handler.next(error);
      },
    ));
  }

  // ======================== AUTH ========================
  Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await _dio.post('/api/auth/login',
        data: {'username': email, 'password': password},
        options: Options(contentType: 'application/x-www-form-urlencoded'));
    await _storage.write(key: 'token', value: res.data['access_token']);
    return res.data;
  }

  Future<Map<String, dynamic>> signup(Map<String, dynamic> data) async {
    final res = await _dio.post('/api/auth/signup', data: data);
    return res.data;
  }

  Future<Map<String, dynamic>> getMe() async {
    final res = await _dio.get('/api/auth/me');
    return res.data;
  }

  Future<void> logout() async => await _storage.delete(key: 'token');

  Future<bool> hasToken() async => await _storage.read(key: 'token') != null;

  // ======================== FARMS ========================
  Future<List> getFarms() async => (await _dio.get('/api/farms')).data;
  Future<Map<String, dynamic>> getFarm(int id) async => (await _dio.get('/api/farms/$id')).data;
  Future<Map<String, dynamic>> getFarmStats(int id) async => (await _dio.get('/api/farms/$id/stats')).data;

  // ======================== DASHBOARD ========================
  Future<Map<String, dynamic>> getDashboardOverview() async => (await _dio.get('/api/dashboard/overview')).data;
  Future<List> getDetections({int limit = 20, String? severity}) async {
    final params = <String, dynamic>{'limit': limit};
    if (severity != null) params['severity'] = severity;
    return (await _dio.get('/api/dashboard/detections', queryParameters: params)).data;
  }
  Future<Map<String, dynamic>> getSensors(int farmId, {int hours = 24}) async =>
      (await _dio.get('/api/dashboard/sensors/$farmId', queryParameters: {'hours': hours})).data;
  Future<List> getNotifications({bool unreadOnly = false}) async =>
      (await _dio.get('/api/dashboard/notifications', queryParameters: {'unread_only': unreadOnly})).data;
  Future<void> markNotificationRead(int id) async => await _dio.put('/api/dashboard/notifications/$id/read');

  // ======================== CROPS ========================
  Future<List> getCrops(int farmId) async => (await _dio.get('/api/crops/farm/$farmId')).data;

  // ======================== ORDERS ========================
  Future<List> getOrders() async => (await _dio.get('/api/orders')).data;
  Future<Map<String, dynamic>> createPaymentIntent(int orderId) async =>
      (await _dio.post('/api/orders/$orderId/payment-intent')).data;

  // ======================== PROFILE ========================
  Future<Map<String, dynamic>> getProfile() async => (await _dio.get('/api/farmers/profile')).data;
  Future<void> updateProfile(Map<String, dynamic> data) async => await _dio.put('/api/farmers/profile', data: data);
  Future<void> updateConsent(Map<String, dynamic> data) async => await _dio.put('/api/farmers/consent', data: data);
}

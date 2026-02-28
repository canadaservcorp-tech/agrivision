import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Service for communicating with the AgriVision central unit (Pi Hub).
/// All mode/storage operations go through the hub's local API.
class HubService extends ChangeNotifier {
  static final HubService _instance = HubService._();
  factory HubService() => _instance;
  HubService._();

  static const _defaultUrl = 'http://agrivision.local:8080';
  static const _prefKey = 'hub_url';
  static const _timeout = Duration(seconds: 4);

  String _hubUrl = _defaultUrl;
  bool _online = false;
  bool _hddMounted = false;
  String _mode = 'monitoring';
  bool _cctvAllowed = false;
  Map<String, dynamic> _disk = {};
  Map<String, dynamic> _paths = {};
  Timer? _pollTimer;

  // Getters
  String get hubUrl => _hubUrl;
  bool get online => _online;
  bool get hddMounted => _hddMounted;
  String get mode => _mode;
  bool get cctvAllowed => _cctvAllowed;
  Map<String, dynamic> get disk => _disk;
  Map<String, dynamic> get paths => _paths;

  /// Initialize: load saved hub URL and start polling.
  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _hubUrl = prefs.getString(_prefKey) ?? _defaultUrl;
    await refresh();
    _startPolling();
  }

  /// Update hub URL and persist.
  Future<void> setHubUrl(String url) async {
    _hubUrl = url.replaceAll(RegExp(r'/+$'), '');
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefKey, _hubUrl);
    _online = false;
    notifyListeners();
    await refresh();
  }

  /// Fetch current storage status + mode from hub.
  Future<void> refresh() async {
    try {
      final results = await Future.wait([
        _get('/api/storage/status'),
        _get('/api/mode'),
      ]);

      final stor = results[0];
      final modeResp = results[1];

      if (stor != null && modeResp != null) {
        _hddMounted = stor['hdd_mounted'] == true;
        _disk = Map<String, dynamic>.from(stor['disk'] ?? {});
        _paths = Map<String, dynamic>.from(stor['paths'] ?? {});
        _mode = modeResp['mode'] ?? 'monitoring';
        _cctvAllowed = modeResp['cctv_allowed'] == true;
        _online = true;
      }
    } catch (_) {
      _online = false;
    }
    notifyListeners();
  }

  /// Set system mode via hub API. Returns error string or null on success.
  Future<String?> setMode(String newMode) async {
    try {
      final resp = await http
          .post(
            Uri.parse('$_hubUrl/api/mode'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'mode': newMode}),
          )
          .timeout(_timeout);

      if (resp.statusCode == 200) {
        _mode = newMode;
        notifyListeners();
        return null;
      }

      final body = jsonDecode(resp.body);
      return body['error'] ?? 'Unknown error';
    } catch (e) {
      _online = false;
      notifyListeners();
      return 'Hub unreachable: $e';
    }
  }

  // ── Internal ──

  Future<Map<String, dynamic>?> _get(String path) async {
    try {
      final resp =
          await http.get(Uri.parse('$_hubUrl$path')).timeout(_timeout);
      if (resp.statusCode == 200) return jsonDecode(resp.body);
    } catch (_) {}
    return null;
  }

  void _startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 10), (_) => refresh());
  }

  void stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }
}

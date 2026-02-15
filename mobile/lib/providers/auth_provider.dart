import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  Map<String, dynamic>? _user;
  bool _loading = false;
  String? _error;

  Map<String, dynamic>? get user => _user;
  bool get loading => _loading;
  bool get isLoggedIn => _user != null;
  String? get error => _error;

  Future<bool> login(String email, String password) async {
    _loading = true; _error = null; notifyListeners();
    try {
      final data = await ApiService.login(email, password);
      _user = data['user'];
      _loading = false; notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _loading = false; notifyListeners();
      return false;
    }
  }

  Future<bool> register(String name, String email, String password, String role) async {
    _loading = true; _error = null; notifyListeners();
    try {
      final data = await ApiService.register(name, email, password, role);
      _user = data['user'];
      _loading = false; notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _loading = false; notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await ApiService.clearToken();
    _user = null;
    notifyListeners();
  }
}

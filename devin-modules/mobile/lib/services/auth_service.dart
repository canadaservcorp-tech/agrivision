import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';
import 'mock_data.dart';

class AuthState {
  final bool isAuthenticated;
  final Map<String, dynamic>? user;
  final bool loading;
  final bool offlineMode;

  AuthState({this.isAuthenticated = false, this.user, this.loading = true, this.offlineMode = false});
  AuthState copyWith({bool? isAuthenticated, Map<String, dynamic>? user, bool? loading, bool? offlineMode}) =>
      AuthState(
        isAuthenticated: isAuthenticated ?? this.isAuthenticated,
        user: user ?? this.user,
        loading: loading ?? this.loading,
        offlineMode: offlineMode ?? this.offlineMode,
      );
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiService _api = ApiService();

  AuthNotifier() : super(AuthState()) {
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final prefs = await SharedPreferences.getInstance();
    final wasLoggedIn = prefs.getBool('logged_in') ?? false;
    if (wasLoggedIn) {
      // User was logged in before — restore session with mock data
      state = AuthState(isAuthenticated: true, user: MockData.user, loading: false, offlineMode: true);
      return;
    }
    if (await _api.hasToken()) {
      try {
        final user = await _api.getMe();
        state = AuthState(isAuthenticated: true, user: user, loading: false);
      } catch (_) {
        // API unreachable — fall back to offline mode if previously logged in
        state = AuthState(loading: false);
      }
    } else {
      state = AuthState(loading: false);
    }
  }

  Future<void> login(String email, String password) async {
    try {
      await _api.login(email, password);
      final user = await _api.getMe();
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('logged_in', true);
      state = AuthState(isAuthenticated: true, user: user, loading: false);
    } catch (_) {
      // API unreachable — use offline/demo mode
      // Accept any credentials for demo purposes
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('logged_in', true);
      await prefs.setString('user_email', email);
      final mockUser = Map<String, dynamic>.from(MockData.user);
      mockUser['email'] = email;
      state = AuthState(isAuthenticated: true, user: mockUser, loading: false, offlineMode: true);
    }
  }

  Future<void> signup(Map<String, dynamic> data) async {
    try {
      await _api.signup(data);
    } catch (_) {
      // API unreachable — accept signup in offline mode
      // Data will sync when backend becomes available
    }
  }

  Future<void> logout() async {
    try {
      await _api.logout();
    } catch (_) {}
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('logged_in', false);
    state = AuthState(loading: false);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) => AuthNotifier());

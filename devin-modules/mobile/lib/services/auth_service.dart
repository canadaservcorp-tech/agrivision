import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'api_service.dart';

class AuthState {
  final bool isAuthenticated;
  final Map<String, dynamic>? user;
  final bool loading;

  AuthState({this.isAuthenticated = false, this.user, this.loading = true});
  AuthState copyWith({bool? isAuthenticated, Map<String, dynamic>? user, bool? loading}) =>
      AuthState(isAuthenticated: isAuthenticated ?? this.isAuthenticated, user: user ?? this.user, loading: loading ?? this.loading);
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiService _api = ApiService();

  AuthNotifier() : super(AuthState()) {
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    if (await _api.hasToken()) {
      try {
        final user = await _api.getMe();
        state = AuthState(isAuthenticated: true, user: user, loading: false);
      } catch (_) {
        state = AuthState(loading: false);
      }
    } else {
      state = AuthState(loading: false);
    }
  }

  Future<void> login(String email, String password) async {
    await _api.login(email, password);
    final user = await _api.getMe();
    state = AuthState(isAuthenticated: true, user: user, loading: false);
  }

  Future<void> signup(Map<String, dynamic> data) async {
    await _api.signup(data);
  }

  Future<void> logout() async {
    await _api.logout();
    state = AuthState(loading: false);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) => AuthNotifier());

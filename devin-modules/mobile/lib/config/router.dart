import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../services/auth_service.dart';
import '../screens/splash_screen.dart';
import '../screens/login_screen.dart';
import '../screens/home_screen.dart';
import '../screens/detections_screen.dart';
import '../screens/cameras_screen.dart';
import '../screens/sensors_screen.dart';
import '../screens/farm_map_screen.dart';
import '../screens/notifications_screen.dart';
import '../screens/settings_screen.dart';
import '../screens/camera_scanner_screen.dart';
import '../screens/mode_control_screen.dart';
import '../screens/production_progress_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final isLoggedIn = auth.isAuthenticated;
      final isLogging = state.matchedLocation == '/login';
      final isSplash = state.matchedLocation == '/';

      if (isSplash) return null;
      if (!isLoggedIn && !isLogging) return '/login';
      if (isLoggedIn && isLogging) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      // Main app shell with bottom nav
      ShellRoute(
        builder: (_, state, child) => AppShell(child: child, location: state.matchedLocation),
        routes: [
          GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
          GoRoute(path: '/detections', builder: (_, __) => const DetectionsScreen()),
          GoRoute(path: '/cameras', builder: (_, __) => const CamerasScreen()),
          GoRoute(path: '/sensors', builder: (_, __) => const SensorsScreen()),
          GoRoute(path: '/map', builder: (_, __) => const FarmMapScreen()),
        ],
      ),
      GoRoute(path: '/notifications', builder: (_, __) => const NotificationsScreen()),
      GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
      GoRoute(path: '/mode', builder: (_, __) => const ModeControlScreen()),
      GoRoute(path: '/production', builder: (_, __) => const ProductionProgressScreen()),
      GoRoute(path: '/scan-camera', builder: (_, __) => const CameraScannerScreen()),
    ],
  );
});

/// Bottom navigation shell
class AppShell extends StatelessWidget {
  final Widget child;
  final String location;

  const AppShell({super.key, required this.child, required this.location});

  int _index() {
    if (location.startsWith('/home')) return 0;
    if (location.startsWith('/detections')) return 1;
    if (location.startsWith('/cameras')) return 2;
    if (location.startsWith('/sensors')) return 3;
    if (location.startsWith('/map')) return 4;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index(),
        onTap: (i) {
          final routes = ['/home', '/detections', '/cameras', '/sensors', '/map'];
          context.go(routes[i]);
        },
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard_rounded), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.bug_report_rounded), label: 'Detections'),
          BottomNavigationBarItem(icon: Icon(Icons.videocam_rounded), label: 'Cameras'),
          BottomNavigationBarItem(icon: Icon(Icons.thermostat_rounded), label: 'Sensors'),
          BottomNavigationBarItem(icon: Icon(Icons.map_rounded), label: 'Map'),
        ],
      ),
    );
  }
}

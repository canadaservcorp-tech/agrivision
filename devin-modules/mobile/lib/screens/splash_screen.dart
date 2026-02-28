import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../services/auth_service.dart';
import '../config/theme.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});
  @override ConsumerState<SplashScreen> createState() => _SplashState();
}

class _SplashState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _navigate();
  }

  Future<void> _navigate() async {
    await Future.delayed(const Duration(seconds: 2));
    if (!mounted) return;
    final auth = ref.read(authProvider);
    if (auth.isAuthenticated) {
      context.go('/home');
    } else {
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AgriTheme.primary,
      body: Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text('🌱', style: TextStyle(fontSize: 64)),
          const SizedBox(height: 16),
          Text('AgriVision', style: TextStyle(
            fontSize: 32, fontWeight: FontWeight.w900, color: Colors.white,
            fontFamily: 'DMSans', letterSpacing: -0.5,
          )),
          const SizedBox(height: 8),
          Text('AI-Powered Farm Monitoring', style: TextStyle(
            fontSize: 14, color: Colors.white.withOpacity(0.7),
          )),
          const SizedBox(height: 40),
          const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(
            strokeWidth: 2, color: Colors.white,
          )),
        ]),
      ),
    );
  }
}

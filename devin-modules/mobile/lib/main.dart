/// AgriVision Mobile App v3.0
/// Entry point — Firebase init, Stripe init, GoRouter, Riverpod
///
/// © 2026 Performance Cristal Technologies Avancées S.A.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_stripe/flutter_stripe.dart';

import 'config/router.dart';
import 'config/theme.dart';
import 'services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Lock orientation to portrait
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);

  // Status bar style
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
  ));

  // Firebase
  await Firebase.initializeApp();

  // Stripe
  Stripe.publishableKey = const String.fromEnvironment(
    'STRIPE_KEY',
    defaultValue: 'pk_test_placeholder',
  );

  // Push notifications
  await NotificationService.initialize();

  runApp(const ProviderScope(child: AgriVisionApp()));
}

class AgriVisionApp extends ConsumerWidget {
  const AgriVisionApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'AgriVision',
      debugShowCheckedModeBanner: false,
      theme: AgriVisionTheme.light,
      darkTheme: AgriVisionTheme.dark,
      themeMode: ThemeMode.light,
      routerConfig: router,
      locale: const Locale('en'),
      supportedLocales: const [
        Locale('en'),
        Locale('ar'),
        Locale('fr'),
        Locale('tr'),
      ],
    );
  }
}
